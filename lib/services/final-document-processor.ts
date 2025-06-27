/**
 * Final Document Processing Service for Vision-Based PDF Pipeline
 * 
 * This service handles the final quality assurance and refinement stage
 * of the vision-based PDF processing pipeline using Claude Sonnet 4 for
 * comprehensive document review and targeted improvements.
 * 
 * Part of the vision-based PDF processing pipeline Stage 5.
 */

import { createRequestLogger } from '@/lib/services/logger'
import { 
  finalDocumentRefinementPrompt,
  type FinalDocumentRefinementInput,
  type FinalDocumentRefinementOutput,
  type EditOperation,
  validateEditOperations,
  applyEditOperations
} from '@/lib/prompts/templates/final-document-refinement'
import { type AssembledDocument } from '@/lib/services/html-assembler'
import { type ValidationResult } from '@/lib/services/html-fragment-validator'
import { z } from 'zod'

// Schema for final processing configuration
export const finalProcessingConfigSchema = z.object({
  maxEditOperations: z.number().int().min(1).max(100).default(50).describe('Maximum number of edit operations to attempt'),
  enableFallbackRewrite: z.boolean().default(true).describe('Enable complete rewrite if edit operations fail'),
  validateBeforeApply: z.boolean().default(true).describe('Validate edit operations before applying them'),
  requireQualityImprovement: z.boolean().default(true).describe('Require measurable quality improvement'),
  maxRetries: z.number().int().min(0).max(3).default(1).describe('Maximum retries for failed operations')
})

// Schema for final processing result
export const finalProcessingResultSchema = z.object({
  refinedDocument: z.string().min(1).describe('Final refined HTML document'),
  appliedOperations: z.array(z.object({
    operation: z.object({
      type: z.literal('replace'),
      description: z.string(),
      old_text: z.string(),
      new_text: z.string()
    }),
    success: z.boolean(),
    error: z.string().optional()
  })).describe('Edit operations that were attempted'),
  qualityAssessment: z.object({
    overall_quality: z.enum(['needs_improvement', 'good', 'excellent']),
    structural_issues_fixed: z.number().int().min(0),
    cross_page_issues_fixed: z.number().int().min(0),
    academic_improvements: z.number().int().min(0),
    critical_errors: z.number().int().min(0),
    remaining_concerns: z.array(z.string())
  }).describe('Quality assessment from AI analysis'),
  processingMetadata: z.object({
    processingTimeMs: z.number(),
    totalOperationsRequested: z.number(),
    totalOperationsApplied: z.number(),
    validationIssues: z.number(),
    usedFallbackRewrite: z.boolean(),
    aiCallsUsed: z.number(),
    tokensUsed: z.number().optional()
  }).describe('Processing metadata and statistics'),
  success: z.boolean().describe('Whether processing completed successfully'),
  errors: z.array(z.string()).describe('Errors encountered during processing'),
  warnings: z.array(z.string()).describe('Non-fatal issues during processing')
})

export type FinalProcessingConfig = z.infer<typeof finalProcessingConfigSchema>
export type FinalProcessingResult = z.infer<typeof finalProcessingResultSchema>

/**
 * Perform final document refinement using Claude Sonnet 4
 */
export async function processFinalDocument(
  assembledDoc: AssembledDocument,
  validationResult?: ValidationResult,
  config: Partial<FinalProcessingConfig> = {}
): Promise<FinalProcessingResult> {
  const logger = createRequestLogger('/services/final-document-processor', `final-${Date.now()}`)
  const startTime = Date.now()
  
  try {
    const validatedConfig = finalProcessingConfigSchema.parse(config || {})
    
    logger.info('Starting final document processing', {
      documentLength: assembledDoc.htmlDocument.length,
      totalPages: assembledDoc.documentMetadata.totalPages,
      hasValidationResult: !!validationResult,
      config: validatedConfig
    })
    
    const errors: string[] = []
    const warnings: string[] = []
    let aiCallsUsed = 0
    let totalTokensUsed = 0
    
    // Prepare assembly issues from validation results
    const assemblyIssues = validationResult ? 
      [
        ...validationResult.structuralIssues.map(issue => ({
          type: issue.type as 'error' | 'warning' | 'info',
          message: issue.message,
          suggestion: issue.suggestion,
          pageNumber: issue.pageNumber,
          element: issue.element
        })),
        ...validationResult.accessibilityIssues.map(issue => ({
          type: issue.type as 'error' | 'warning' | 'info',
          message: issue.message,
          element: issue.element
        })),
        ...validationResult.academicIssues.map(issue => ({
          type: issue.type as 'error' | 'warning' | 'info',
          message: issue.message,
          element: issue.element
        }))
      ] : []
    
    // Prepare input for AI refinement
    const refinementInput: FinalDocumentRefinementInput = {
      htmlDocument: assembledDoc.htmlDocument,
      fileName: extractFileNameFromMetadata(assembledDoc),
      totalPages: assembledDoc.documentMetadata.totalPages,
      documentMetadata: assembledDoc.documentMetadata,
      assemblyIssues
    }
    
    let refinedDocument = assembledDoc.htmlDocument
    let usedFallbackRewrite = false
    const appliedOperations: any[] = []
    
    // Attempt targeted refinement with edit operations
    try {
      logger.info('Requesting AI refinement analysis', {
        documentLength: refinementInput.htmlDocument.length,
        assemblyIssuesCount: assemblyIssues.length
      })
      
      const aiResult = await finalDocumentRefinementPrompt.runWithRetry(refinementInput)
      aiCallsUsed++
      
      if (aiResult.usage?.totalTokens) {
        totalTokensUsed += aiResult.usage.totalTokens
      }
      
      // Parse AI response
      let refinementOutput: FinalDocumentRefinementOutput
      try {
        // Try to parse as JSON directly
        refinementOutput = JSON.parse(aiResult.completion)
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = aiResult.completion.match(/```json\n([\s\S]*?)\n```/)
        if (jsonMatch) {
          refinementOutput = JSON.parse(jsonMatch[1])
        } else {
          throw new Error('AI response is not valid JSON')
        }
      }
      
      logger.info('Received AI refinement analysis', {
        editOperationsCount: refinementOutput.edit_operations.length,
        overallQuality: refinementOutput.quality_assessment.overall_quality,
        shouldRewrite: refinementOutput.rewrite_recommendation.should_rewrite
      })
      
      // Check if AI recommends complete rewrite
      if (refinementOutput.rewrite_recommendation.should_rewrite && validatedConfig.enableFallbackRewrite) {
        logger.info('AI recommends complete rewrite', {
          reason: refinementOutput.rewrite_recommendation.reason
        })
        
        usedFallbackRewrite = true
        // For now, we'll skip the complete rewrite implementation
        warnings.push('AI recommended complete rewrite, but fallback rewrite is not yet implemented')
      } else {
        // Apply edit operations
        const editResult = await applyEditOperationsWithValidation(
          refinedDocument,
          refinementOutput.edit_operations,
          validatedConfig,
          logger
        )
        
        refinedDocument = editResult.document
        appliedOperations.push(...editResult.operations)
        
        if (editResult.errors.length > 0) {
          errors.push(...editResult.errors)
        }
        
        if (editResult.warnings.length > 0) {
          warnings.push(...editResult.warnings)
        }
      }
      
      const processingTimeMs = Date.now() - startTime
      
      logger.info('Final document processing completed', {
        processingTimeMs,
        totalOperationsRequested: refinementOutput?.edit_operations?.length || 0,
        totalOperationsApplied: appliedOperations.filter(op => op.success).length,
        aiCallsUsed,
        totalTokensUsed,
        usedFallbackRewrite,
        finalDocumentLength: refinedDocument.length
      })
      
      return finalProcessingResultSchema.parse({
        refinedDocument,
        appliedOperations,
        qualityAssessment: refinementOutput?.quality_assessment || {
          overall_quality: 'needs_improvement' as const,
          structural_issues_fixed: 0,
          cross_page_issues_fixed: 0,
          academic_improvements: 0,
          critical_errors: errors.length,
          remaining_concerns: ['Processing failed to complete']
        },
        processingMetadata: {
          processingTimeMs,
          totalOperationsRequested: refinementOutput?.edit_operations?.length || 0,
          totalOperationsApplied: appliedOperations.filter(op => op.success).length,
          validationIssues: appliedOperations.filter(op => !op.success).length,
          usedFallbackRewrite,
          aiCallsUsed,
          tokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined
        },
        success: errors.length === 0,
        errors,
        warnings
      })
      
    } catch (aiError) {
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI processing error'
      logger.error('AI refinement failed', {
        error: errorMessage,
        aiCallsUsed,
        totalTokensUsed
      })
      
      errors.push(`AI refinement failed: ${errorMessage}`)
      
      // If AI fails and fallback is enabled, return original document
      if (validatedConfig.enableFallbackRewrite) {
        warnings.push('Using original assembled document due to AI refinement failure')
        usedFallbackRewrite = true
      } else {
        errors.push('AI refinement failed and fallback rewrite is disabled')
      }
    }
    
    const processingTimeMs = Date.now() - startTime
    
    return finalProcessingResultSchema.parse({
      refinedDocument,
      appliedOperations,
      qualityAssessment: {
        overall_quality: 'needs_improvement' as const,
        structural_issues_fixed: 0,
        cross_page_issues_fixed: 0,
        academic_improvements: 0,
        critical_errors: errors.length,
        remaining_concerns: errors.length > 0 ? ['Processing encountered errors'] : []
      },
      processingMetadata: {
        processingTimeMs,
        totalOperationsRequested: 0,
        totalOperationsApplied: 0,
        validationIssues: 0,
        usedFallbackRewrite,
        aiCallsUsed,
        tokensUsed: totalTokensUsed > 0 ? totalTokensUsed : undefined
      },
      success: errors.length === 0,
      errors,
      warnings
    })
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
    
    logger.error('Final document processing failed', {
      processingTimeMs,
      error: errorMessage
    })
    
    return finalProcessingResultSchema.parse({
      refinedDocument: assembledDoc.htmlDocument, // Return original document on failure
      appliedOperations: [],
      qualityAssessment: {
        overall_quality: 'needs_improvement' as const,
        structural_issues_fixed: 0,
        cross_page_issues_fixed: 0,
        academic_improvements: 0,
        critical_errors: 1,
        remaining_concerns: ['Processing failed completely']
      },
      processingMetadata: {
        processingTimeMs,
        totalOperationsRequested: 0,
        totalOperationsApplied: 0,
        validationIssues: 0,
        usedFallbackRewrite: false,
        aiCallsUsed: 0
      },
      success: false,
      errors: [errorMessage],
      warnings: []
    })
  }
}

/**
 * Apply edit operations with validation and error handling
 */
async function applyEditOperationsWithValidation(
  document: string,
  editOperations: EditOperation[],
  config: FinalProcessingConfig,
  logger: any
): Promise<{
  document: string,
  operations: any[],
  errors: string[],
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []
  const operations: any[] = []
  let workingDocument = document
  
  // Limit operations if needed
  const limitedOperations = editOperations.slice(0, config.maxEditOperations)
  if (editOperations.length > config.maxEditOperations) {
    warnings.push(`Limited edit operations from ${editOperations.length} to ${config.maxEditOperations}`)
  }
  
  logger.info('Applying edit operations', {
    totalOperations: limitedOperations.length,
    validateBeforeApply: config.validateBeforeApply
  })
  
  // Validate operations if configured
  if (config.validateBeforeApply) {
    const validation = validateEditOperations(limitedOperations, workingDocument)
    
    if (validation.invalid.length > 0) {
      warnings.push(`${validation.invalid.length} edit operations failed validation`)
      
      validation.invalid.forEach(({ operation, reason }) => {
        operations.push({
          operation,
          success: false,
          error: reason
        })
      })
    }
    
    // Only apply valid operations
    for (const operation of validation.valid) {
      try {
        workingDocument = applyEditOperations(workingDocument, [operation])
        
        operations.push({
          operation,
          success: true
        })
        
        logger.debug('Applied edit operation', {
          description: operation.description,
          oldTextLength: operation.old_text.length,
          newTextLength: operation.new_text.length
        })
        
      } catch (applyError) {
        const errorMessage = applyError instanceof Error ? applyError.message : 'Unknown apply error'
        operations.push({
          operation,
          success: false,
          error: errorMessage
        })
        
        warnings.push(`Failed to apply operation: ${operation.description}`)
      }
    }
  } else {
    // Apply all operations without validation
    for (const operation of limitedOperations) {
      try {
        workingDocument = applyEditOperations(workingDocument, [operation])
        
        operations.push({
          operation,
          success: true
        })
        
      } catch (applyError) {
        const errorMessage = applyError instanceof Error ? applyError.message : 'Unknown apply error'
        operations.push({
          operation,
          success: false,
          error: errorMessage
        })
        
        warnings.push(`Failed to apply operation: ${operation.description}`)
      }
    }
  }
  
  const successfulOperations = operations.filter(op => op.success).length
  logger.info('Edit operations application completed', {
    totalRequested: limitedOperations.length,
    successfullyApplied: successfulOperations,
    failed: operations.length - successfulOperations
  })
  
  return {
    document: workingDocument,
    operations,
    errors,
    warnings
  }
}

/**
 * Extract filename from assembled document metadata
 */
function extractFileNameFromMetadata(assembledDoc: AssembledDocument): string | undefined {
  // Check if filename is in assembly notes
  const filenameNote = assembledDoc.assemblyNotes.find(note => 
    note.includes('filename:') || note.includes('Processing file:')
  )
  
  if (filenameNote) {
    const match = filenameNote.match(/(?:filename:|Processing file:)\s*(.+)/)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return undefined
}

/**
 * Quick final processing for simple document cleanup (no AI analysis)
 */
export async function quickFinalProcessing(
  assembledDoc: AssembledDocument
): Promise<string> {
  const logger = createRequestLogger('/services/final-document-processor', `quick-final-${Date.now()}`)
  
  logger.info('Quick final processing - basic cleanup only', {
    documentLength: assembledDoc.htmlDocument.length
  })
  
  let cleanedDocument = assembledDoc.htmlDocument
  
  // Basic cleanup operations without AI
  cleanedDocument = cleanedDocument
    // Remove empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    // Remove duplicate spaces in text content
    .replace(/>\s+</g, '><')
    // Ensure proper spacing around block elements
    .replace(/(<\/(?:div|p|section|article|header|footer)>)(?!\s*<)/g, '$1\n')
  
  logger.info('Quick final processing completed', {
    originalLength: assembledDoc.htmlDocument.length,
    cleanedLength: cleanedDocument.length
  })
  
  return cleanedDocument
}
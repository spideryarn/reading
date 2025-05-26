import { NextRequest, NextResponse } from 'next/server'

// Hardcoded sample entities for testing UI
const sampleEntities = [
  {
    name: "René Descartes",
    ontology: "person" as const,
    aliases: ["Descartes", "Cartesius"],
    brief_explanation: "French philosopher, mathematician, and scientist (1596-1650). Known for 'I think, therefore I am' and founding analytical geometry.",
    long_explanation: "René Descartes was a French philosopher, mathematician, and scientist who lived from 1596 to 1650. Often called the 'Father of Modern Philosophy', he made groundbreaking contributions to mathematics (Cartesian coordinates), philosophy (methodological skepticism, mind-body dualism), and physics. His famous declaration 'Cogito, ergo sum' ('I think, therefore I am') established a foundation for knowledge based on the certainty of self-awareness.",
    datetime: "1596-1650",
    url: "https://en.wikipedia.org/wiki/René_Descartes"
  },
  {
    name: "Cogito ergo sum",
    ontology: "concept" as const,
    aliases: ["I think therefore I am", "the cogito"],
    brief_explanation: "Descartes' foundational philosophical proposition asserting that the act of doubting one's own existence proves that one exists.",
    long_explanation: "A philosophical proposition by René Descartes that became a fundamental element of Western philosophy. It is a conclusion reached through methodological skepticism: even if one doubts everything, the very act of doubting confirms the existence of the thinking self. This forms the basis of Descartes' epistemology and his attempt to build certain knowledge from first principles."
  },
  {
    name: "Mind-body dualism",
    ontology: "concept" as const,
    aliases: ["Cartesian dualism", "substance dualism"],
    brief_explanation: "The philosophical view that mind and body are distinct and separable substances, with mind being non-physical and body being physical.",
    long_explanation: "A central doctrine in Descartes' philosophy holding that reality consists of two fundamental types of substance: res cogitans (thinking substance/mind) and res extensa (extended substance/matter). This view attempts to explain how immaterial mind can interact with material body, leading to the famous 'mind-body problem' that continues to challenge philosophers today."
  },
  {
    name: "Paris",
    ontology: "place" as const,
    aliases: ["City of Light"],
    brief_explanation: "Capital city of France where Descartes spent significant time and engaged with leading intellectuals of his era.",
    url: "https://en.wikipedia.org/wiki/Paris"
  },
  {
    name: "Meditations on First Philosophy",
    ontology: "reference" as const,
    aliases: ["Meditations", "Meditationes de prima philosophia"],
    brief_explanation: "Descartes' 1641 philosophical treatise that introduces methodological skepticism and argues for the existence of God and the immortality of the soul.",
    datetime: "1641"
  },
  {
    name: "Scientific Revolution",
    ontology: "event" as const,
    aliases: ["The Scientific Revolution"],
    brief_explanation: "A period of major scientific advances (roughly 1543-1687) during which Descartes made significant contributions to mathematics and natural philosophy.",
    datetime: "1543-1687"
  },
  {
    name: "Rationalism",
    ontology: "theme" as const,
    aliases: ["Continental rationalism"],
    brief_explanation: "Philosophical movement emphasizing reason as the primary source of knowledge, rather than sensory experience. Descartes is considered a founding figure."
  },
  {
    name: "The Pineal Gland",
    ontology: "object" as const,
    aliases: ["Pineal body"],
    brief_explanation: "Small endocrine gland in the brain that Descartes believed was the 'seat of the soul' and point of interaction between mind and body."
  },
  {
    name: "Royal Swedish Academy",
    ontology: "organization" as const,
    aliases: [],
    brief_explanation: "Institution that invited Descartes to Sweden in 1649, where he tutored Queen Christina before his death in 1650."
  },
  {
    name: "Methodological skepticism",
    ontology: "definition" as const,
    aliases: ["Cartesian doubt", "hyperbolic doubt"],
    brief_explanation: "Descartes' systematic process of doubting all beliefs that could possibly be false, used as a method to establish certain foundations for knowledge."
  }
]

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }
    
    // For now, return hardcoded sample entities
    // TODO: Replace with actual LLM call in Step 3
    return NextResponse.json({ entities: sampleEntities })
  } catch (error) {
    console.error('Error generating glossary:', error)
    return NextResponse.json(
      { error: 'Failed to generate glossary' },
      { status: 500 }
    )
  }
}
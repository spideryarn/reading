'use client';

import React, { useEffect, useRef, useState } from 'react';
import Mark from 'mark.js';

export default function TestMarkJsPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [markInstance, setMarkInstance] = useState<Mark | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      setMarkInstance(new Mark(contentRef.current));
    }
  }, []);

  useEffect(() => {
    if (!markInstance || !contentRef.current) return;

    // Clear previous highlights
    markInstance.unmark();

    // Apply new highlights
    if (searchTerm.trim()) {
      markInstance.mark(searchTerm, {
        separateWordSearch: false,
        acrossElements: true,
        className: 'search-highlight',
        done: (totalMatches) => {
          console.log(`Found ${totalMatches} matches for "${searchTerm}"`);
        }
      });
    }
  }, [searchTerm, markInstance]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mark.js Cross-Element Search Test</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for text..."
          className="w-full p-2 border rounded"
        />
      </div>

      <div ref={contentRef} className="prose prose-lg">
        <h2>Test Document</h2>
        <p>This is a test document to verify that <strong>Mark.js</strong> can find text across elements.</p>
        <p>Try searching for "Mark.js can find" to see cross-element highlighting in action.</p>
        
        <h3>Complex Example</h3>
        <p>The <em>hard problem</em> of consciousness refers to the difficulty</p>
        <p>of explaining subjective experience in physical terms.</p>
        
        <p>Search for these test cases:</p>
        <ul>
          <li>"hard problem of" - spans em tag</li>
          <li>"difficulty of explaining" - spans two paragraphs (won't highlight as one match)</li>
          <li>"subjective experience" - within single paragraph</li>
        </ul>

        <style jsx>{`
          :global(.search-highlight) {
            background-color: #ffeb3b;
            font-weight: bold;
            padding: 2px 0;
          }
        `}</style>
      </div>
    </div>
  );
}
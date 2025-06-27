'use client'

import Image from 'next/image'
import { LOGO_ANIMATIONS } from '@/lib/animations/logo-animations'

// Logo component with different animations
interface LogoPlaygroundItemProps {
  title: string
  description: string
  animationClass: string
}

function LogoPlaygroundItem({ title, description, animationClass }: LogoPlaygroundItemProps) {
  // Split "Spideryarn" into individual letters for animation
  const letters = "Spideryarn".split("")
  
  // Add autoplay version of the animation class for playground
  const autoplayClass = `${animationClass}-autoplay`
  
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-center justify-center h-32 mb-4">
        <div className={`flex items-center space-x-3 ${animationClass}`}>
          <Image
            src="/spideryarn-logo.png"
            alt="Spideryarn logo"
            width={32}
            height={32}
            className="h-8 w-8 logo-image"
          />
          <span className="text-xl font-semibold text-spideryarn-orange font-trebuchet logo-text">
            {letters.map((letter, index) => (
              <span key={index} className="logo-letter" style={{ animationDelay: `${index * 0.1}s` }}>
                {letter}
              </span>
            ))}
          </span>
        </div>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  )
}

export default function LogoPlaygroundPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Logo Animation Playground</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Exploring delightful hover animations for the Spideryarn logo. 
            Hover over each example to see the animation in action!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Original simple scale for reference */}
          <LogoPlaygroundItem
            title="Original (Simple Scale)"
            description="The current implementation - simple scale on hover"
            animationClass="transition-transform duration-200 hover:scale-105"
          />
          
          {/* All logo animations from shared definitions */}
          {LOGO_ANIMATIONS.map(animation => (
            <LogoPlaygroundItem
              key={animation.id}
              title={animation.name}
              description={animation.description}
              animationClass={animation.cssClass}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        /* Base styles that all animations can build upon */
        .logo-image {
          transition: all 0.3s ease;
        }
        
        .logo-text {
          transition: all 0.3s ease;
        }

        /* Individual letter selection for text animations */
        .letter-animation .logo-text {
          display: inline-block;
        }

        /* PAGE FLIP ANIMATION - 3D flip like turning pages in a book */
        .page-flip-animation {
          perspective: 1000px;
          transform-style: preserve-3d;
        }

        .page-flip-animation:hover {
          animation: pageFlip 0.8s ease-in-out;
        }

        @keyframes pageFlip {
          0% { transform: rotateY(0deg) scale(1); }
          25% { transform: rotateY(-15deg) scale(1.02) translateZ(10px); }
          50% { transform: rotateY(180deg) scale(0.95) translateZ(20px); }
          75% { transform: rotateY(195deg) scale(1.02) translateZ(10px); }
          100% { transform: rotateY(360deg) scale(1); }
        }

        /* Add slight randomness with multiple variants */
        .page-flip-animation:hover:nth-child(odd) {
          animation: pageFlipAlt 0.9s ease-in-out;
        }

        @keyframes pageFlipAlt {
          0% { transform: rotateY(0deg) scale(1); }
          30% { transform: rotateY(20deg) scale(1.05) translateZ(15px); }
          50% { transform: rotateY(-180deg) scale(0.9) translateZ(25px); }
          70% { transform: rotateY(-165deg) scale(1.05) translateZ(15px); }
          100% { transform: rotateY(-360deg) scale(1); }
        }

        /* HIGHLIGHT SWEEP ANIMATION - Like marking important passages */
        .highlight-sweep-animation {
          position: relative;
          overflow: hidden;
        }

        .highlight-sweep-animation::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 171, 15, 0.3) 20%, 
            rgba(255, 171, 15, 0.6) 50%, 
            rgba(255, 171, 15, 0.3) 80%, 
            transparent 100%);
          transition: all 0.6s ease;
          z-index: 1;
        }

        .highlight-sweep-animation::before {
          left: -100%;
          animation: highlightSweep 0.8s ease-out infinite;
          animation-delay: 1s;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }

        .highlight-sweep-animation:hover::before {
          animation-delay: 0s;
        }

        @keyframes highlightSweep {
          0%, 80% { left: -100%; transform: skewX(-10deg); }
          50% { transform: skewX(5deg); }
          100% { left: 100%; transform: skewX(-5deg); }
        }

        /* Random direction variant */
        .highlight-sweep-animation:nth-child(even)::before {
          animation: highlightSweepReverse 0.9s ease-out infinite;
          animation-delay: 1.2s;
          animation-direction: alternate;
        }

        .highlight-sweep-animation:nth-child(even):hover::before {
          animation-delay: 0s;
        }

        @keyframes highlightSweepReverse {
          0% { left: 100%; transform: skewX(10deg); }
          50% { transform: skewX(-5deg); }
          100% { left: -100%; transform: skewX(5deg); }
        }

        /* SCANNER LINE ANIMATION - OCR-style document analysis */
        .scanner-line-animation {
          position: relative;
          overflow: hidden;
        }

        .scanner-line-animation::after {
          content: '';
          position: absolute;
          top: -2px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #00ff00 30%, 
            #ffffff 50%, 
            #00ff00 70%, 
            transparent 100%);
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
          transform: translateX(-100%);
          opacity: 0;
          transition: all 0.3s ease;
        }

        .scanner-line-animation:hover::after {
          opacity: 1;
          animation: scannerSweep 1.2s ease-in-out infinite;
        }

        @keyframes scannerSweep {
          0% { transform: translateX(-100%) translateY(0px); }
          25% { transform: translateX(100%) translateY(10px); }
          50% { transform: translateX(100%) translateY(20px); }
          75% { transform: translateX(-100%) translateY(30px); }
          100% { transform: translateX(-100%) translateY(0px); }
        }

        /* Add scanning effect to the logo and text */
        .scanner-line-animation:hover .logo-image {
          filter: brightness(1.1) contrast(1.1);
          animation: scannerGlow 1.2s ease-in-out infinite;
        }

        .scanner-line-animation:hover .logo-text {
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
          animation: scannerTextGlow 1.2s ease-in-out infinite;
        }

        @keyframes scannerGlow {
          0%, 100% { filter: brightness(1) contrast(1); }
          25% { filter: brightness(1.2) contrast(1.2) hue-rotate(5deg); }
          50% { filter: brightness(1.1) contrast(1.3) hue-rotate(-5deg); }
          75% { filter: brightness(1.15) contrast(1.1) hue-rotate(3deg); }
        }

        @keyframes scannerTextGlow {
          0%, 100% { text-shadow: none; }
          25% { text-shadow: 0 0 8px rgba(0, 255, 0, 0.4), 0 0 12px rgba(0, 255, 0, 0.2); }
          50% { text-shadow: 0 0 5px rgba(0, 255, 0, 0.6), 0 0 10px rgba(0, 255, 0, 0.3); }
          75% { text-shadow: 0 0 10px rgba(0, 255, 0, 0.3), 0 0 15px rgba(0, 255, 0, 0.1); }
        }

        /* Random timing variants for all animations */
        .page-flip-animation:hover:nth-child(3n) {
          animation-duration: 0.7s;
        }

        .highlight-sweep-animation:hover:nth-child(3n) {
          animation-duration: 1.0s;
        }

        .scanner-line-animation:hover:nth-child(3n)::after {
          animation-duration: 1.0s;
        }

        /* ============================================== */
        /* SOPHISTICATED PREMIUM ANIMATIONS FOR ACADEMICS */
        /* ============================================== */

        /* WARM GLOW PULSE - Sophisticated pulsing glow with subtle warmth */
        .glow-pulse-animation {
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glow-pulse-animation:hover {
          filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.4));
        }

        .glow-pulse-animation .logo-image {
          animation: warmGlowPulse 3s ease-in-out infinite;
          animation-delay: 2s;
        }

        .glow-pulse-animation .logo-text {
          animation: textGlowPulse 3.2s ease-in-out infinite;
          animation-delay: 2.1s;
        }

        .glow-pulse-animation:hover .logo-image {
          animation-delay: 0s;
          animation-duration: 2s;
        }

        .glow-pulse-animation:hover .logo-text {
          animation-delay: 0s;
          animation-duration: 2.3s;
        }

        .glow-pulse-animation::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .glow-pulse-animation::before {
          animation: ambientGlow 3.5s ease-in-out infinite;
          animation-delay: 2.2s;
        }

        .glow-pulse-animation:hover::before {
          animation-delay: 0s;
          animation-duration: 2.5s;
        }

        @keyframes warmGlowPulse {
          0% { 
            filter: brightness(1) drop-shadow(0 0 4px rgba(255, 107, 53, 0.3));
            transform: scale(1);
          }
          15% { 
            filter: brightness(1.15) drop-shadow(0 0 12px rgba(255, 107, 53, 0.5));
            transform: scale(1.02);
          }
          30% { 
            filter: brightness(1.25) drop-shadow(0 0 16px rgba(255, 107, 53, 0.6));
            transform: scale(1.04);
          }
          45% { 
            filter: brightness(1.1) drop-shadow(0 0 10px rgba(255, 107, 53, 0.4));
            transform: scale(1.01);
          }
          60% { 
            filter: brightness(1.05) drop-shadow(0 0 6px rgba(255, 107, 53, 0.25));
            transform: scale(1.005);
          }
          80% { 
            filter: brightness(1.02) drop-shadow(0 0 3px rgba(255, 107, 53, 0.15));
            transform: scale(1.001);
          }
          100% { 
            filter: brightness(1) drop-shadow(0 0 0px rgba(255, 107, 53, 0));
            transform: scale(1);
          }
        }

        @keyframes textGlowPulse {
          0% { 
            text-shadow: 0 0 6px rgba(255, 107, 53, 0.2);
            transform: scale(1);
          }
          20% { 
            text-shadow: 0 0 12px rgba(255, 107, 53, 0.35);
            transform: scale(1.008);
          }
          40% { 
            text-shadow: 0 0 18px rgba(255, 107, 53, 0.45);
            transform: scale(1.015);
          }
          55% { 
            text-shadow: 0 0 22px rgba(255, 107, 53, 0.5);
            transform: scale(1.012);
          }
          70% { 
            text-shadow: 0 0 15px rgba(255, 107, 53, 0.3);
            transform: scale(1.005);
          }
          85% { 
            text-shadow: 0 0 8px rgba(255, 107, 53, 0.15);
            transform: scale(1.002);
          }
          100% { 
            text-shadow: 0 0 0px rgba(255, 107, 53, 0);
            transform: scale(1);
          }
        }

        @keyframes ambientGlow {
          0% { opacity: 0.3; transform: scale(1); }
          25% { opacity: 0.5; transform: scale(1.1); }
          50% { opacity: 0.7; transform: scale(1.15); }
          70% { opacity: 0.4; transform: scale(1.08); }
          85% { opacity: 0.2; transform: scale(1.03); }
          100% { opacity: 0; transform: scale(1); }
        }

        /* PREMIUM 3D DEPTH - Elegant 3D tilt with sophisticated depth */
        .depth-tilt-animation {
          perspective: 400px;
          transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .depth-tilt-animation:hover {
          transform: translateZ(10px);
        }

        .depth-tilt-animation:hover .logo-image {
          animation: premium3DTilt 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .depth-tilt-animation:hover .logo-text {
          animation: text3DDepth 2.1s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .depth-tilt-animation::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          width: 80%;
          height: 20px;
          background: radial-gradient(ellipse, rgba(0, 0, 0, 0.15) 0%, transparent 70%);
          transform: translateX(-50%) translateY(10px);
          opacity: 0;
          transition: all 0.6s ease;
          pointer-events: none;
        }

        .depth-tilt-animation:hover::after {
          animation: depthShadow 2s ease-in-out infinite;
        }

        @keyframes premium3DTilt {
          0%, 100% { 
            transform: rotateX(0deg) rotateY(0deg) translateZ(0px);
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
          }
          16% { 
            transform: rotateX(3deg) rotateY(-2deg) translateZ(8px);
            filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.15));
          }
          33% { 
            transform: rotateX(-2deg) rotateY(4deg) translateZ(12px);
            filter: drop-shadow(-3px 6px 12px rgba(0, 0, 0, 0.2));
          }
          50% { 
            transform: rotateX(4deg) rotateY(-1deg) translateZ(15px);
            filter: drop-shadow(1px 8px 16px rgba(0, 0, 0, 0.25));
          }
          66% { 
            transform: rotateX(-3deg) rotateY(3deg) translateZ(10px);
            filter: drop-shadow(-2px 5px 10px rgba(0, 0, 0, 0.18));
          }
          83% { 
            transform: rotateX(1deg) rotateY(-2deg) translateZ(5px);
            filter: drop-shadow(1px 3px 6px rgba(0, 0, 0, 0.12));
          }
        }

        @keyframes text3DDepth {
          0%, 100% { 
            transform: translateZ(0px) rotateX(0deg);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          20% { 
            transform: translateZ(6px) rotateX(2deg);
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          }
          40% { 
            transform: translateZ(10px) rotateX(-1deg);
            text-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
          }
          60% { 
            transform: translateZ(12px) rotateX(3deg);
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
          }
          80% { 
            transform: translateZ(8px) rotateX(-2deg);
            text-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
          }
        }

        @keyframes depthShadow {
          0%, 100% { 
            opacity: 0.3; 
            transform: translateX(-50%) translateY(10px) scale(1);
          }
          25% { 
            opacity: 0.5; 
            transform: translateX(-48%) translateY(15px) scale(1.1);
          }
          50% { 
            opacity: 0.7; 
            transform: translateX(-52%) translateY(20px) scale(1.2);
          }
          75% { 
            opacity: 0.4; 
            transform: translateX(-50%) translateY(18px) scale(1.15);
          }
        }

        /* SILK SHIMMER SWEEP - Refined gradient shimmer with premium elegance */
        .shimmer-sweep-animation {
          position: relative;
          overflow: hidden;
          transition: all 0.5s ease;
        }

        .shimmer-sweep-animation:hover {
          transform: translateY(-2px);
          filter: drop-shadow(0 4px 12px rgba(255, 107, 53, 0.15));
        }

        .shimmer-sweep-animation::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 40%,
            rgba(255, 255, 255, 0.1) 45%,
            rgba(255, 107, 53, 0.2) 50%,
            rgba(255, 255, 255, 0.1) 55%,
            transparent 60%
          );
          transform: translateX(-100%) translateY(-100%);
          transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          pointer-events: none;
        }

        .shimmer-sweep-animation:hover::before {
          animation: silkShimmer 2.5s ease-in-out infinite;
        }

        .shimmer-sweep-animation:hover .logo-image {
          animation: imageShimmer 2.5s ease-in-out infinite;
        }

        .shimmer-sweep-animation:hover .logo-text {
          animation: textShimmer 2.5s ease-in-out infinite;
        }

        @keyframes silkShimmer {
          0% { 
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
            opacity: 0;
          }
          15% { 
            transform: translateX(-50%) translateY(-50%) rotate(45deg);
            opacity: 0.6;
          }
          30% { 
            transform: translateX(0%) translateY(0%) rotate(45deg);
            opacity: 1;
          }
          45% { 
            transform: translateX(50%) translateY(50%) rotate(45deg);
            opacity: 0.8;
          }
          60% { 
            transform: translateX(100%) translateY(100%) rotate(45deg);
            opacity: 0.3;
          }
          100% { 
            transform: translateX(150%) translateY(150%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes imageShimmer {
          0%, 100% { 
            filter: brightness(1) saturate(1) contrast(1);
            transform: scale(1);
          }
          15% { 
            filter: brightness(1.1) saturate(1.2) contrast(1.05);
            transform: scale(1.02);
          }
          30% { 
            filter: brightness(1.2) saturate(1.3) contrast(1.1);
            transform: scale(1.04);
          }
          45% { 
            filter: brightness(1.15) saturate(1.25) contrast(1.08);
            transform: scale(1.03);
          }
          60% { 
            filter: brightness(1.05) saturate(1.1) contrast(1.02);
            transform: scale(1.01);
          }
        }

        @keyframes textShimmer {
          0%, 100% { 
            color: #ff6b35;
            text-shadow: none;
            transform: scale(1);
          }
          15% { 
            color: #ff7a47;
            text-shadow: 0 0 4px rgba(255, 107, 53, 0.3);
            transform: scale(1.005);
          }
          30% { 
            color: #ff8a5a;
            text-shadow: 0 0 8px rgba(255, 107, 53, 0.4);
            transform: scale(1.01);
          }
          45% { 
            color: #ff7a47;
            text-shadow: 0 0 6px rgba(255, 107, 53, 0.35);
            transform: scale(1.008);
          }
          60% { 
            color: #ff6b35;
            text-shadow: 0 0 2px rgba(255, 107, 53, 0.2);
            transform: scale(1.003);
          }
        }

        /* ============================================== */
        /* MISSING ANIMATION IMPLEMENTATIONS */
        /* ============================================== */

        /* LETTER WIGGLE - Clothesline dancing effect that repeats every second */
        .letter-wiggle .logo-letter {
          display: inline-block;
          animation-duration: 2s;
          animation-iteration-count: infinite;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
          transform-origin: top center;
        }

        .letter-wiggle .logo-letter {
          animation-name: clotheslineDance;
        }

        .letter-wiggle:hover .logo-letter {
          animation-duration: 1.5s;
        }

        /* Staggered timing for clothesline effect */
        .letter-wiggle .logo-letter:nth-child(1) { animation-delay: 0s; }
        .letter-wiggle .logo-letter:nth-child(2) { animation-delay: 0.08s; }
        .letter-wiggle .logo-letter:nth-child(3) { animation-delay: 0.16s; }
        .letter-wiggle .logo-letter:nth-child(4) { animation-delay: 0.24s; }
        .letter-wiggle .logo-letter:nth-child(5) { animation-delay: 0.32s; }
        .letter-wiggle .logo-letter:nth-child(6) { animation-delay: 0.4s; }
        .letter-wiggle .logo-letter:nth-child(7) { animation-delay: 0.48s; }
        .letter-wiggle .logo-letter:nth-child(8) { animation-delay: 0.56s; }
        .letter-wiggle .logo-letter:nth-child(9) { animation-delay: 0.64s; }

        /* Varying wind intensities and directions for different letters */
        .letter-wiggle .logo-letter:nth-child(1) { animation-name: clotheslineStrong; }
        .letter-wiggle .logo-letter:nth-child(2) { animation-name: clotheslineGentle; }
        .letter-wiggle .logo-letter:nth-child(3) { animation-name: clotheslineTwist; }
        .letter-wiggle .logo-letter:nth-child(4) { animation-name: clotheslineLeft; }
        .letter-wiggle .logo-letter:nth-child(5) { animation-name: clotheslineRight; }
        .letter-wiggle .logo-letter:nth-child(6) { animation-name: clotheslineGentle; }
        .letter-wiggle .logo-letter:nth-child(7) { animation-name: clotheslineStrong; }
        .letter-wiggle .logo-letter:nth-child(8) { animation-name: clotheslineTwist; }
        .letter-wiggle .logo-letter:nth-child(9) { animation-name: clotheslineLeft; }

        @keyframes clotheslineStrong {
          0% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
          8% { transform: translateX(3px) translateY(-2px) rotate(2deg) skewX(1deg); }
          16% { transform: translateX(-4px) translateY(1px) rotate(-3deg) skewX(-2deg); }
          24% { transform: translateX(5px) translateY(-3px) rotate(4deg) skewX(2deg); }
          32% { transform: translateX(-3px) translateY(2px) rotate(-2deg) skewX(-1deg); }
          40% { transform: translateX(2px) translateY(-1px) rotate(1deg) skewX(0.5deg); }
          50% { transform: translateX(-1px) translateY(1px) rotate(-0.5deg) skewX(-0.3deg); }
          70% { transform: translateX(0.5px) translateY(-0.2px) rotate(0.2deg) skewX(0.1deg); }
          85% { transform: translateX(-0.2px) translateY(0.1px) rotate(-0.1deg) skewX(0deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
        }

        @keyframes clotheslineGentle {
          0% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
          10% { transform: translateX(-2px) translateY(1px) rotate(-1.5deg) skewX(-0.8deg); }
          20% { transform: translateX(3px) translateY(-1px) rotate(2deg) skewX(1deg); }
          30% { transform: translateX(-2px) translateY(2px) rotate(-1deg) skewX(-0.5deg); }
          40% { transform: translateX(1px) translateY(-1px) rotate(0.8deg) skewX(0.3deg); }
          55% { transform: translateX(-0.5px) translateY(0.5px) rotate(-0.3deg) skewX(-0.1deg); }
          75% { transform: translateX(0.2px) translateY(-0.1px) rotate(0.1deg) skewX(0deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
        }

        @keyframes clotheslineTwist {
          0% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
          12% { transform: translateX(1px) translateY(-3px) rotate(1deg) skewX(1.5deg); }
          24% { transform: translateX(-2px) translateY(2px) rotate(-2deg) skewX(-1deg); }
          36% { transform: translateX(3px) translateY(-1px) rotate(2.5deg) skewX(0.8deg); }
          48% { transform: translateX(-1px) translateY(1px) rotate(-1deg) skewX(-0.4deg); }
          60% { transform: translateX(0.5px) translateY(-0.5px) rotate(0.3deg) skewX(0.2deg); }
          80% { transform: translateX(-0.1px) translateY(0.2px) rotate(-0.1deg) skewX(0deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
        }

        @keyframes clotheslineLeft {
          0% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
          15% { transform: translateX(-3px) translateY(1px) rotate(-2deg) skewX(-1.2deg); }
          30% { transform: translateX(-1px) translateY(-2px) rotate(-1deg) skewX(-0.8deg); }
          45% { transform: translateX(-2px) translateY(1px) rotate(-1.5deg) skewX(-0.5deg); }
          60% { transform: translateX(-0.5px) translateY(-0.5px) rotate(-0.3deg) skewX(-0.2deg); }
          80% { transform: translateX(-0.1px) translateY(0.1px) rotate(-0.1deg) skewX(0deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
        }

        @keyframes clotheslineRight {
          0% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
          15% { transform: translateX(3px) translateY(-1px) rotate(2deg) skewX(1.2deg); }
          30% { transform: translateX(1px) translateY(2px) rotate(1deg) skewX(0.8deg); }
          45% { transform: translateX(2px) translateY(-1px) rotate(1.5deg) skewX(0.5deg); }
          60% { transform: translateX(0.5px) translateY(0.5px) rotate(0.3deg) skewX(0.2deg); }
          80% { transform: translateX(0.1px) translateY(-0.1px) rotate(0.1deg) skewX(0deg); }
          100% { transform: translateX(0) translateY(0) rotate(0deg) skewX(0deg); }
        }


        /* ELASTIC STRETCH - Subtle, smooth stretching */
        .elastic-stretch .logo-letter {
          display: inline-block;
          animation-duration: 3s;
          animation-iteration-count: infinite;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .elastic-stretch:hover .logo-letter {
          animation-duration: 2s;
        }

        /* Subtle random elastic timing and directions */
        .elastic-stretch .logo-letter:nth-child(odd) { 
          animation-delay: 0s; 
          animation-name: elasticStretchVertical;
        }
        .elastic-stretch .logo-letter:nth-child(even) { 
          animation-delay: 0.4s; 
          animation-name: elasticStretchHorizontal;
        }
        .elastic-stretch .logo-letter:nth-child(3n) { 
          animation-delay: 0.8s; 
          animation-name: elasticStretchDiagonal;
        }

        @keyframes elasticStretchVertical {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.15) scaleX(0.95); }
          50% { transform: scaleY(0.9) scaleX(1.08); }
          75% { transform: scaleY(1.05) scaleX(0.98); }
        }

        @keyframes elasticStretchHorizontal {
          0%, 100% { transform: scaleX(1) scaleY(1); }
          30% { transform: scaleX(1.12) scaleY(0.92); }
          60% { transform: scaleX(0.88) scaleY(1.06); }
        }

        @keyframes elasticStretchDiagonal {
          0%, 100% { transform: scale(1) rotate(0deg); }
          40% { transform: scale(1.08, 0.94) rotate(1deg); }
          80% { transform: scale(0.94, 1.06) rotate(-0.5deg); }
        }

        /* STRAND PULSE - Smooth wave-like pulses from logo */
        .strand-pulse {
          position: relative;
          overflow: visible;
        }

        .strand-pulse::before,
        .strand-pulse::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: radial-gradient(
            circle,
            rgba(255, 107, 53, 0.3) 0%,
            rgba(255, 107, 53, 0.15) 30%,
            rgba(255, 107, 53, 0.05) 60%,
            transparent 100%
          );
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          pointer-events: none;
        }

        .strand-pulse:hover::before {
          animation: smoothWavePulse 2.5s ease-out infinite;
        }

        .strand-pulse:hover::after {
          animation: smoothWavePulse 2.5s ease-out infinite 0.8s;
        }

        .strand-pulse:hover .logo-image {
          animation: gentleFloat 2.5s ease-in-out infinite;
          filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.3));
        }

        @keyframes smoothWavePulse {
          0% { 
            width: 0; 
            height: 0; 
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          25% { 
            width: 80px; 
            height: 80px; 
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.05);
          }
          50% { 
            width: 140px; 
            height: 140px; 
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1.1);
          }
          75% { 
            width: 180px; 
            height: 180px; 
            opacity: 0.2;
            transform: translate(-50%, -50%) scale(1.05);
          }
          100% { 
            width: 220px; 
            height: 220px; 
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes gentleFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
            filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.3));
          }
          25% { 
            transform: translateY(-1px) scale(1.01);
            filter: drop-shadow(0 0 12px rgba(255, 107, 53, 0.4));
          }
          50% { 
            transform: translateY(-2px) scale(1.02);
            filter: drop-shadow(0 0 16px rgba(255, 107, 53, 0.5));
          }
          75% { 
            transform: translateY(-1px) scale(1.01);
            filter: drop-shadow(0 0 12px rgba(255, 107, 53, 0.4));
          }
        }

        /* WEB THREADING - Lines connecting logo to letters */
        .web-threading {
          position: relative;
          overflow: visible;
        }

        .web-threading::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 40px;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(255, 107, 53, 0.8) 0%,
            rgba(255, 107, 53, 0.4) 30%,
            rgba(255, 107, 53, 0.2) 60%,
            transparent 100%
          );
          transform: scaleX(0);
          transform-origin: left;
          opacity: 0;
          pointer-events: none;
        }

        .web-threading:hover::before {
          animation: webThread 1.5s ease-out infinite;
        }

        .web-threading:hover .logo-letter {
          animation: letterConnect 1.5s ease-in-out infinite;
        }

        @keyframes webThread {
          0% { 
            transform: scaleX(0); 
            opacity: 0; 
          }
          20% { 
            transform: scaleX(0.3); 
            opacity: 0.8; 
          }
          40% { 
            transform: scaleX(0.7); 
            opacity: 1; 
          }
          60% { 
            transform: scaleX(1); 
            opacity: 0.6; 
          }
          80% { 
            transform: scaleX(0.5); 
            opacity: 0.3; 
          }
          100% { 
            transform: scaleX(0); 
            opacity: 0; 
          }
        }

        @keyframes letterConnect {
          0%, 100% { 
            transform: translateX(0); 
            text-shadow: none; 
          }
          25% { 
            transform: translateX(-2px); 
            text-shadow: -2px 0 4px rgba(255, 107, 53, 0.4); 
          }
          50% { 
            transform: translateX(-4px); 
            text-shadow: -4px 0 8px rgba(255, 107, 53, 0.6); 
          }
          75% { 
            transform: translateX(-2px); 
            text-shadow: -2px 0 4px rgba(255, 107, 53, 0.4); 
          }
        }

        /* WEB WEAVING - Circles emerge from random text positions */
        .web-weaving {
          position: relative;
          overflow: visible;
        }

        /* Create multiple circles that emerge from different horizontal positions */
        .web-weaving::before,
        .web-weaving::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 30px;
          height: 30px;
          background: radial-gradient(
            circle,
            rgba(255, 107, 53, 0.4) 0%,
            rgba(255, 107, 53, 0.2) 50%,
            transparent 100%
          );
          border: 1px solid rgba(255, 107, 53, 0.6);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }

        /* Circle 1 - emerges from left side of text */
        .web-weaving::before {
          left: 60%;
          transform: translateY(-50%);
        }

        /* Circle 2 - emerges from right side of text */
        .web-weaving::after {
          left: 85%;
          transform: translateY(-50%);
        }

        .web-weaving:hover::before {
          animation: emergeFromText1 2.5s ease-out infinite;
        }

        .web-weaving:hover::after {
          animation: emergeFromText2 2.5s ease-out infinite;
          animation-delay: 0.8s;
        }

        .web-weaving:hover .logo-image {
          animation: gentleGlow 2.5s ease-in-out infinite;
        }

        .web-weaving:hover .logo-text {
          animation: textShimmer 2.5s ease-in-out infinite;
        }

        @keyframes emergeFromText1 {
          0% { 
            left: 60%;
            width: 15px;
            height: 15px;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          20% { 
            left: 55%;
            width: 40px;
            height: 40px;
            opacity: 0.8;
            transform: translateY(-50%) scale(1);
          }
          40% { 
            left: 45%;
            width: 60px;
            height: 60px;
            opacity: 0.6;
            transform: translateY(-50%) scale(1.2);
          }
          60% { 
            left: 35%;
            width: 80px;
            height: 80px;
            opacity: 0.4;
            transform: translateY(-50%) scale(1.5);
          }
          80% { 
            left: 25%;
            width: 100px;
            height: 100px;
            opacity: 0.2;
            transform: translateY(-50%) scale(1.8);
          }
          100% { 
            left: 15%;
            width: 120px;
            height: 120px;
            opacity: 0;
            transform: translateY(-50%) scale(2);
          }
        }

        @keyframes emergeFromText2 {
          0% { 
            left: 85%;
            width: 15px;
            height: 15px;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          25% { 
            left: 90%;
            width: 35px;
            height: 35px;
            opacity: 0.7;
            transform: translateY(-50%) scale(0.9);
          }
          50% { 
            left: 95%;
            width: 55px;
            height: 55px;
            opacity: 0.5;
            transform: translateY(-50%) scale(1.1);
          }
          75% { 
            left: 100%;
            width: 75px;
            height: 75px;
            opacity: 0.3;
            transform: translateY(-50%) scale(1.4);
          }
          100% { 
            left: 105%;
            width: 95px;
            height: 95px;
            opacity: 0;
            transform: translateY(-50%) scale(1.7);
          }
        }

        @keyframes gentleGlow {
          0%, 100% { 
            filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.3));
            transform: scale(1);
          }
          50% { 
            filter: drop-shadow(0 0 12px rgba(255, 107, 53, 0.5));
            transform: scale(1.05);
          }
        }

        /* PARTICLE EXPLOSION - Elements explode into particles and reform */
        .particle-explosion {
          position: relative;
          overflow: hidden;
        }

        .particle-explosion::before {
          content: '• • • • • • • •';
          position: absolute;
          top: 50%;
          left: 50%;
          color: rgba(255, 107, 53, 0.8);
          font-size: 12px;
          transform: translate(-50%, -50%);
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
        }

        .particle-explosion:hover::before {
          animation: particleExplode 2.5s ease-out infinite;
        }

        .particle-explosion:hover .logo-image,
        .particle-explosion:hover .logo-text {
          animation: elementExplode 2.5s ease-out infinite;
        }

        @keyframes particleExplode {
          0% { 
            transform: translate(-50%, -50%) scale(0.1);
            opacity: 0;
          }
          10% { 
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0.8;
          }
          20% { 
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 1;
          }
          40% { 
            transform: translate(-50%, -50%) scale(3) rotate(90deg);
            opacity: 0.6;
          }
          60% { 
            transform: translate(-50%, -50%) scale(4.5) rotate(180deg);
            opacity: 0.3;
          }
          80% { 
            transform: translate(-50%, -50%) scale(6) rotate(270deg);
            opacity: 0.1;
          }
          100% { 
            transform: translate(-50%, -50%) scale(8) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes elementExplode {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            filter: blur(0px);
            opacity: 1;
          }
          15% { 
            transform: scale(1.2) rotate(5deg);
            filter: blur(0px);
            opacity: 0.9;
          }
          30% { 
            transform: scale(0.3) rotate(-10deg);
            filter: blur(2px);
            opacity: 0.3;
          }
          45% { 
            transform: scale(0.1) rotate(15deg);
            filter: blur(4px);
            opacity: 0.1;
          }
          60% { 
            transform: scale(0.5) rotate(-5deg);
            filter: blur(2px);
            opacity: 0.5;
          }
          75% { 
            transform: scale(0.8) rotate(3deg);
            filter: blur(1px);
            opacity: 0.8;
          }
          90% { 
            transform: scale(1.1) rotate(-2deg);
            filter: blur(0px);
            opacity: 0.95;
          }
        }

        /* LIQUID MORPHING - Logo morphs like liquid */
        .liquid-morphing:hover .logo-image {
          animation: liquidMorph 3s ease-in-out infinite;
        }

        .liquid-morphing:hover .logo-text {
          animation: textLiquidFlow 3s ease-in-out infinite;
        }

        @keyframes liquidMorph {
          0%, 100% { 
            transform: scale(1) skew(0deg, 0deg);
            filter: contrast(1) brightness(1);
            border-radius: 0%;
          }
          16% { 
            transform: scale(1.1, 0.9) skew(5deg, 0deg);
            filter: contrast(1.1) brightness(1.1);
            border-radius: 30%;
          }
          33% { 
            transform: scale(0.8, 1.3) skew(-3deg, 2deg);
            filter: contrast(1.2) brightness(0.9);
            border-radius: 60%;
          }
          50% { 
            transform: scale(1.3, 0.7) skew(2deg, -4deg);
            filter: contrast(1.3) brightness(1.2);
            border-radius: 80%;
          }
          66% { 
            transform: scale(0.9, 1.2) skew(-4deg, 1deg);
            filter: contrast(1.1) brightness(0.8);
            border-radius: 40%;
          }
          83% { 
            transform: scale(1.2, 0.8) skew(1deg, -2deg);
            filter: contrast(1.2) brightness(1.1);
            border-radius: 20%;
          }
        }

        @keyframes textLiquidFlow {
          0%, 100% { 
            transform: scaleX(1) scaleY(1) skew(0deg);
            text-shadow: none;
          }
          20% { 
            transform: scaleX(1.1) scaleY(0.9) skew(2deg);
            text-shadow: 2px 0 4px rgba(255, 107, 53, 0.3);
          }
          40% { 
            transform: scaleX(0.9) scaleY(1.2) skew(-1deg);
            text-shadow: -1px 2px 6px rgba(255, 107, 53, 0.4);
          }
          60% { 
            transform: scaleX(1.2) scaleY(0.8) skew(3deg);
            text-shadow: 3px -1px 8px rgba(255, 107, 53, 0.5);
          }
          80% { 
            transform: scaleX(0.85) scaleY(1.15) skew(-2deg);
            text-shadow: -2px 1px 5px rgba(255, 107, 53, 0.3);
          }
        }

        /* MAGNETIC VORTEX - Orbital motion with magnetic effects */
        .magnetic-vortex {
          position: relative;
          overflow: visible;
        }

        .magnetic-vortex::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 80px;
          height: 80px;
          background: radial-gradient(
            circle,
            transparent 30%,
            rgba(255, 107, 53, 0.1) 40%,
            rgba(255, 107, 53, 0.3) 50%,
            rgba(255, 107, 53, 0.1) 60%,
            transparent 70%
          );
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          pointer-events: none;
        }

        .magnetic-vortex:hover::before {
          animation: magneticField 4s ease-in-out infinite;
        }

        .magnetic-vortex:hover .logo-letter {
          animation: magneticPull 4s ease-in-out infinite;
        }

        .magnetic-vortex:hover .logo-image {
          animation: magneticCore 4s ease-in-out infinite;
        }

        /* Stagger the magnetic pull for each letter */
        .magnetic-vortex:hover .logo-letter:nth-child(1) { animation-delay: 0s; }
        .magnetic-vortex:hover .logo-letter:nth-child(2) { animation-delay: 0.2s; }
        .magnetic-vortex:hover .logo-letter:nth-child(3) { animation-delay: 0.4s; }
        .magnetic-vortex:hover .logo-letter:nth-child(4) { animation-delay: 0.6s; }
        .magnetic-vortex:hover .logo-letter:nth-child(5) { animation-delay: 0.8s; }
        .magnetic-vortex:hover .logo-letter:nth-child(6) { animation-delay: 1.0s; }
        .magnetic-vortex:hover .logo-letter:nth-child(7) { animation-delay: 1.2s; }
        .magnetic-vortex:hover .logo-letter:nth-child(8) { animation-delay: 1.4s; }
        .magnetic-vortex:hover .logo-letter:nth-child(9) { animation-delay: 1.6s; }

        @keyframes magneticField {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            opacity: 0.3;
          }
          25% { 
            transform: translate(-50%, -50%) scale(1.2) rotate(90deg);
            opacity: 0.6;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
            opacity: 0.8;
          }
          75% { 
            transform: translate(-50%, -50%) scale(1.3) rotate(270deg);
            opacity: 0.5;
          }
        }

        @keyframes magneticPull {
          0%, 100% { 
            transform: translateX(0) translateY(0) rotate(0deg);
            text-shadow: none;
          }
          25% { 
            transform: translateX(-3px) translateY(-2px) rotate(-2deg);
            text-shadow: -2px -1px 4px rgba(255, 107, 53, 0.4);
          }
          50% { 
            transform: translateX(-6px) translateY(-4px) rotate(-4deg);
            text-shadow: -4px -2px 8px rgba(255, 107, 53, 0.6);
          }
          75% { 
            transform: translateX(-3px) translateY(-2px) rotate(-2deg);
            text-shadow: -2px -1px 4px rgba(255, 107, 53, 0.4);
          }
        }

        @keyframes magneticCore {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(255, 107, 53, 0));
          }
          25% { 
            transform: scale(1.05);
            filter: brightness(1.1) drop-shadow(0 0 4px rgba(255, 107, 53, 0.4));
          }
          50% { 
            transform: scale(1.1);
            filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 107, 53, 0.6));
          }
          75% { 
            transform: scale(1.05);
            filter: brightness(1.1) drop-shadow(0 0 4px rgba(255, 107, 53, 0.4));
          }
        }

        /* ============================================== */
        /* GLOSSARY & ENTITY EXTRACTION THEMED ANIMATIONS */
        /* ============================================== */

        /* ENTITY HIGHLIGHT - Letters light up in sequence like key terms being identified */
        .entity-highlight .logo-letter {
          display: inline-block;
          position: relative;
          transition: all 0.3s ease;
        }

        .entity-highlight .logo-letter::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, 
            rgba(255, 107, 53, 0.8) 0%, 
            rgba(255, 171, 15, 0.6) 50%, 
            rgba(255, 107, 53, 0.8) 100%);
          border-radius: 4px;
          opacity: 0;
          transform: scale(0.8);
          z-index: -1;
          pointer-events: none;
        }

        .entity-highlight:hover .logo-letter {
          animation: entityIdentification 2s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        /* Sequential highlighting with random categorisation colours */
        .entity-highlight:hover .logo-letter:nth-child(1) { 
          animation-delay: 0s; 
          --category-color: rgba(59, 130, 246, 0.6); /* Blue - Person */
        }
        .entity-highlight:hover .logo-letter:nth-child(2) { 
          animation-delay: 0.15s; 
          --category-color: rgba(16, 185, 129, 0.6); /* Green - Concept */
        }
        .entity-highlight:hover .logo-letter:nth-child(3) { 
          animation-delay: 0.3s; 
          --category-color: rgba(245, 101, 101, 0.6); /* Red - Place */
        }
        .entity-highlight:hover .logo-letter:nth-child(4) { 
          animation-delay: 0.45s; 
          --category-color: rgba(139, 92, 246, 0.6); /* Purple - Organisation */
        }
        .entity-highlight:hover .logo-letter:nth-child(5) { 
          animation-delay: 0.6s; 
          --category-color: rgba(236, 72, 153, 0.6); /* Pink - Method */
        }
        .entity-highlight:hover .logo-letter:nth-child(6) { 
          animation-delay: 0.75s; 
          --category-color: rgba(59, 130, 246, 0.6); /* Blue - Person */
        }
        .entity-highlight:hover .logo-letter:nth-child(7) { 
          animation-delay: 0.9s; 
          --category-color: rgba(16, 185, 129, 0.6); /* Green - Concept */
        }
        .entity-highlight:hover .logo-letter:nth-child(8) { 
          animation-delay: 1.05s; 
          --category-color: rgba(245, 101, 101, 0.6); /* Red - Place */
        }
        .entity-highlight:hover .logo-letter:nth-child(9) { 
          animation-delay: 1.2s; 
          --category-color: rgba(139, 92, 246, 0.6); /* Purple - Organisation */
        }

        @keyframes entityIdentification {
          0% { 
            transform: scale(1);
            color: #ff6b35;
            text-shadow: none;
          }
          15% { 
            transform: scale(1.08);
            color: #ffffff;
            text-shadow: 0 0 8px var(--category-color, rgba(255, 107, 53, 0.6));
          }
          30% { 
            transform: scale(1.12);
            color: #ffffff;
            text-shadow: 0 0 12px var(--category-color, rgba(255, 107, 53, 0.8));
          }
          45% { 
            transform: scale(1.06);
            color: #ffffff;
            text-shadow: 0 0 16px var(--category-color, rgba(255, 107, 53, 0.9));
          }
          70% { 
            transform: scale(1.02);
            color: #ff6b35;
            text-shadow: 0 0 6px var(--category-color, rgba(255, 107, 53, 0.4));
          }
          85% { 
            transform: scale(1.01);
            color: #ff6b35;
            text-shadow: 0 0 3px var(--category-color, rgba(255, 107, 53, 0.2));
          }
          100% { 
            transform: scale(1);
            color: #ff6b35;
            text-shadow: none;
          }
        }

        .entity-highlight:hover .logo-letter::before {
          animation: entityHighlightGlow 2s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        @keyframes entityHighlightGlow {
          0% { 
            opacity: 0;
            transform: scale(0.8);
          }
          15% { 
            opacity: 0.6;
            transform: scale(1.05);
            background: var(--category-color, rgba(255, 107, 53, 0.6));
          }
          30% { 
            opacity: 0.8;
            transform: scale(1.1);
            background: var(--category-color, rgba(255, 107, 53, 0.8));
          }
          45% { 
            opacity: 0.9;
            transform: scale(1.08);
            background: var(--category-color, rgba(255, 107, 53, 0.9));
          }
          70% { 
            opacity: 0.4;
            transform: scale(1.02);
            background: var(--category-color, rgba(255, 107, 53, 0.4));
          }
          85% { 
            opacity: 0.2;
            transform: scale(1.01);
            background: var(--category-color, rgba(255, 107, 53, 0.2));
          }
          100% { 
            opacity: 0;
            transform: scale(1);
          }
        }

        /* GLOSSARY BUILDER - Definition bubbles appear around letters */
        .glossary-builder {
          position: relative;
          overflow: visible;
        }

        .glossary-builder .logo-letter {
          display: inline-block;
          position: relative;
        }

        .glossary-builder .logo-letter::after {
          content: attr(data-definition);
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 107, 53, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: normal;
          color: #333;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        /* Definition content for each letter */
        .glossary-builder .logo-letter:nth-child(1)::after { content: 'Spider: Web weaver'; }
        .glossary-builder .logo-letter:nth-child(2)::after { content: 'Process: Method'; }
        .glossary-builder .logo-letter:nth-child(3)::after { content: 'Intelligence: AI'; }
        .glossary-builder .logo-letter:nth-child(4)::after { content: 'Document: Text'; }
        .glossary-builder .logo-letter:nth-child(5)::after { content: 'Entity: Key term'; }
        .glossary-builder .logo-letter:nth-child(6)::after { content: 'Yarn: Thread'; }
        .glossary-builder .logo-letter:nth-child(7)::after { content: 'Analysis: Study'; }
        .glossary-builder .logo-letter:nth-child(8)::after { content: 'Research: Investigation'; }
        .glossary-builder .logo-letter:nth-child(9)::after { content: 'Network: Connection'; }

        .glossary-builder:hover .logo-letter {
          animation: glossaryDefinition 2.5s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        .glossary-builder:hover .logo-letter:nth-child(1) { animation-delay: 0.1s; }
        .glossary-builder:hover .logo-letter:nth-child(2) { animation-delay: 0.25s; }
        .glossary-builder:hover .logo-letter:nth-child(3) { animation-delay: 0.4s; }
        .glossary-builder:hover .logo-letter:nth-child(4) { animation-delay: 0.55s; }
        .glossary-builder:hover .logo-letter:nth-child(5) { animation-delay: 0.7s; }
        .glossary-builder:hover .logo-letter:nth-child(6) { animation-delay: 0.85s; }
        .glossary-builder:hover .logo-letter:nth-child(7) { animation-delay: 1s; }
        .glossary-builder:hover .logo-letter:nth-child(8) { animation-delay: 1.15s; }
        .glossary-builder:hover .logo-letter:nth-child(9) { animation-delay: 1.3s; }

        @keyframes glossaryDefinition {
          0% { 
            transform: scale(1);
            color: #ff6b35;
          }
          10% { 
            transform: scale(1.05);
            color: #ff7a47;
          }
          20% { 
            transform: scale(1.08);
            color: #ff8a5a;
          }
          85% { 
            transform: scale(1.03);
            color: #ff7a47;
          }
          100% { 
            transform: scale(1);
            color: #ff6b35;
          }
        }

        .glossary-builder:hover .logo-letter::after {
          animation: definitionBubble 2.5s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        @keyframes definitionBubble {
          0% { 
            opacity: 0;
            transform: translateX(-50%) translateY(10px) scale(0.5);
          }
          15% { 
            opacity: 0.8;
            transform: translateX(-50%) translateY(-5px) scale(0.9);
          }
          25% { 
            opacity: 1;
            transform: translateX(-50%) translateY(-8px) scale(1);
          }
          75% { 
            opacity: 0.9;
            transform: translateX(-50%) translateY(-8px) scale(1);
          }
          90% { 
            opacity: 0.3;
            transform: translateX(-50%) translateY(-5px) scale(0.95);
          }
          100% { 
            opacity: 0;
            transform: translateX(-50%) translateY(5px) scale(0.8);
          }
        }

        /* Random bubble positioning variation */
        .glossary-builder .logo-letter:nth-child(even)::after {
          top: -40px;
        }
        .glossary-builder .logo-letter:nth-child(3n)::after {
          top: -30px;
          left: 60%;
        }
        .glossary-builder .logo-letter:nth-child(3n+1)::after {
          top: -42px;
          left: 40%;
        }

        /* TERM EXTRACTION - Letters float up and reorganise by category */
        .term-extraction .logo-letter {
          display: inline-block;
          transition: all 0.4s ease;
        }

        .term-extraction:hover .logo-letter {
          animation: termExtraction 3s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        /* Category-based extraction with different heights and colours */
        .term-extraction:hover .logo-letter:nth-child(1) { 
          animation-delay: 0.05s; 
          --extract-height: -25px;
          --category-colour: #3b82f6; /* Blue - Person */
        }
        .term-extraction:hover .logo-letter:nth-child(2) { 
          animation-delay: 0.15s; 
          --extract-height: -35px;
          --category-colour: #10b981; /* Green - Concept */
        }
        .term-extraction:hover .logo-letter:nth-child(3) { 
          animation-delay: 0.25s; 
          --extract-height: -20px;
          --category-colour: #f56565; /* Red - Place */
        }
        .term-extraction:hover .logo-letter:nth-child(4) { 
          animation-delay: 0.35s; 
          --extract-height: -40px;
          --category-colour: #8b5cf6; /* Purple - Organisation */
        }
        .term-extraction:hover .logo-letter:nth-child(5) { 
          animation-delay: 0.45s; 
          --extract-height: -30px;
          --category-colour: #ec4899; /* Pink - Method */
        }
        .term-extraction:hover .logo-letter:nth-child(6) { 
          animation-delay: 0.55s; 
          --extract-height: -22px;
          --category-colour: #3b82f6; /* Blue - Person */
        }
        .term-extraction:hover .logo-letter:nth-child(7) { 
          animation-delay: 0.65s; 
          --extract-height: -38px;
          --category-colour: #10b981; /* Green - Concept */
        }
        .term-extraction:hover .logo-letter:nth-child(8) { 
          animation-delay: 0.75s; 
          --extract-height: -28px;
          --category-colour: #f56565; /* Red - Place */
        }
        .term-extraction:hover .logo-letter:nth-child(9) { 
          animation-delay: 0.85s; 
          --extract-height: -33px;
          --category-colour: #8b5cf6; /* Purple - Organisation */
        }

        @keyframes termExtraction {
          0% { 
            transform: translateY(0) scale(1) rotate(0deg);
            color: #ff6b35;
            text-shadow: none;
          }
          15% { 
            transform: translateY(-5px) scale(1.02) rotate(1deg);
            color: #ff7a47;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          30% { 
            transform: translateY(var(--extract-height, -30px)) scale(1.05) rotate(2deg);
            color: var(--category-colour, #ff6b35);
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          45% { 
            transform: translateY(var(--extract-height, -30px)) scale(1.08) rotate(1deg);
            color: var(--category-colour, #ff6b35);
            text-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
          }
          60% { 
            transform: translateY(var(--extract-height, -30px)) scale(1.03) rotate(-1deg);
            color: var(--category-colour, #ff6b35);
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          75% { 
            transform: translateY(-10px) scale(1.01) rotate(0deg);
            color: #ff7a47;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          }
          90% { 
            transform: translateY(-2px) scale(1.005) rotate(0deg);
            color: #ff6b35;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
          100% { 
            transform: translateY(0) scale(1) rotate(0deg);
            color: #ff6b35;
            text-shadow: none;
          }
        }

        /* Category indicators - small dots that appear during extraction */
        .term-extraction .logo-letter::before {
          content: '';
          position: absolute;
          top: -12px;
          left: 50%;
          width: 6px;
          height: 6px;
          background: var(--category-colour, #ff6b35);
          border-radius: 50%;
          transform: translateX(-50%) scale(0);
          opacity: 0;
          pointer-events: none;
        }

        .term-extraction:hover .logo-letter::before {
          animation: categoryIndicator 3s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        @keyframes categoryIndicator {
          0% { 
            transform: translateX(-50%) scale(0);
            opacity: 0;
          }
          30% { 
            transform: translateX(-50%) scale(1);
            opacity: 0.8;
          }
          60% { 
            transform: translateX(-50%) scale(1.2);
            opacity: 1;
          }
          80% { 
            transform: translateX(-50%) scale(0.8);
            opacity: 0.6;
          }
          100% { 
            transform: translateX(-50%) scale(0);
            opacity: 0;
          }
        }

        /* Hover effect on the logo image during term extraction */
        .term-extraction:hover .logo-image {
          animation: extractionAnalysis 3s ease-in-out 1;
          animation-fill-mode: forwards;
        }

        @keyframes extractionAnalysis {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(255, 107, 53, 0));
          }
          20% { 
            transform: scale(1.02);
            filter: brightness(1.05) drop-shadow(0 0 4px rgba(255, 107, 53, 0.3));
          }
          40% { 
            transform: scale(1.04);
            filter: brightness(1.1) drop-shadow(0 0 8px rgba(255, 107, 53, 0.4));
          }
          60% { 
            transform: scale(1.03);
            filter: brightness(1.08) drop-shadow(0 0 6px rgba(255, 107, 53, 0.35));
          }
          80% { 
            transform: scale(1.01);
            filter: brightness(1.03) drop-shadow(0 0 3px rgba(255, 107, 53, 0.2));
          }
        }

        /* ============================================== */
        /* DOCUMENT PROCESSING ANIMATIONS FOR ACADEMICS */
        /* ============================================== */

        /* DOCUMENT PARSE - Scanning lines analyze structure with hierarchical organization */
        .document-parse {
          position: relative;
          overflow: hidden;
        }

        /* Multiple scanning lines for comprehensive analysis */
        .document-parse::before,
        .document-parse::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #00ff88 20%, 
            #ffffff 50%, 
            #00ff88 80%, 
            transparent 100%);
          box-shadow: 0 0 6px rgba(0, 255, 136, 0.4);
          opacity: 0;
          pointer-events: none;
        }

        .document-parse::after {
          height: 1px;
          top: auto;
          bottom: 0;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #ff6b35 20%, 
            #ffffff 50%, 
            #ff6b35 80%, 
            transparent 100%);
          box-shadow: 0 0 6px rgba(255, 107, 53, 0.4);
        }

        .document-parse:hover::before {
          animation: parseTopScan 2.2s ease-in-out 1;
        }

        .document-parse:hover::after {
          animation: parseBottomScan 2.2s ease-in-out 1;
          animation-delay: 0.3s;
        }

        .document-parse:hover .logo-image {
          animation: parseImageAnalysis 2.5s ease-in-out 1;
        }

        .document-parse:hover .logo-letter {
          animation: parseLetterStructure 2.5s ease-in-out 1;
        }

        /* Staggered letter analysis with randomness */
        .document-parse:hover .logo-letter:nth-child(odd) { animation-delay: 0s; }
        .document-parse:hover .logo-letter:nth-child(even) { animation-delay: 0.1s; }
        .document-parse:hover .logo-letter:nth-child(3n) { animation-delay: 0.2s; }
        .document-parse:hover .logo-letter:nth-child(4n) { animation-delay: 0.15s; }

        @keyframes parseTopScan {
          0% { 
            transform: translateX(-100%) translateY(0px);
            opacity: 0;
          }
          15% { 
            transform: translateX(50%) translateY(10px);
            opacity: 1;
          }
          30% { 
            transform: translateX(100%) translateY(20px);
            opacity: 0.8;
          }
          45% { 
            transform: translateX(-100%) translateY(30px);
            opacity: 0.6;
          }
          60% { 
            transform: translateX(100%) translateY(40px);
            opacity: 0.4;
          }
          100% { 
            transform: translateX(150%) translateY(50px);
            opacity: 0;
          }
        }

        @keyframes parseBottomScan {
          0% { 
            transform: translateX(100%) translateY(0px);
            opacity: 0;
          }
          20% { 
            transform: translateX(-50%) translateY(-10px);
            opacity: 0.9;
          }
          40% { 
            transform: translateX(-100%) translateY(-20px);
            opacity: 0.7;
          }
          60% { 
            transform: translateX(100%) translateY(-30px);
            opacity: 0.5;
          }
          100% { 
            transform: translateX(-150%) translateY(-40px);
            opacity: 0;
          }
        }

        @keyframes parseImageAnalysis {
          0% { 
            transform: scale(1);
            filter: brightness(1) contrast(1) hue-rotate(0deg);
          }
          15% { 
            transform: scale(1.03);
            filter: brightness(1.1) contrast(1.1) hue-rotate(10deg);
          }
          30% { 
            transform: scale(1.06);
            filter: brightness(1.2) contrast(1.2) hue-rotate(-5deg);
          }
          45% { 
            transform: scale(1.04);
            filter: brightness(1.15) contrast(1.15) hue-rotate(15deg);
          }
          60% { 
            transform: scale(1.02);
            filter: brightness(1.08) contrast(1.08) hue-rotate(-10deg);
          }
          80% { 
            transform: scale(1.01);
            filter: brightness(1.03) contrast(1.03) hue-rotate(3deg);
          }
          100% { 
            transform: scale(1);
            filter: brightness(1) contrast(1) hue-rotate(0deg);
          }
        }

        @keyframes parseLetterStructure {
          0% { 
            transform: translateY(0) scale(1);
            color: #ff6b35;
            text-shadow: none;
          }
          12% { 
            transform: translateY(-2px) scale(1.02);
            color: #ff7a47;
            text-shadow: 0 0 4px rgba(0, 255, 136, 0.3);
          }
          25% { 
            transform: translateY(-4px) scale(1.05);
            color: #00ff88;
            text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
          }
          40% { 
            transform: translateY(-3px) scale(1.03);
            color: #88ffaa;
            text-shadow: 0 0 6px rgba(0, 255, 136, 0.4);
          }
          55% { 
            transform: translateY(-1px) scale(1.01);
            color: #ff8a5a;
            text-shadow: 0 0 3px rgba(255, 107, 53, 0.3);
          }
          70% { 
            transform: translateY(-0.5px) scale(1.005);
            color: #ff7a47;
            text-shadow: 0 0 2px rgba(255, 107, 53, 0.2);
          }
          100% { 
            transform: translateY(0) scale(1);
            color: #ff6b35;
            text-shadow: none;
          }
        }

        /* FORMAT CONVERT - Elements transform between different document formats */
        .format-convert {
          position: relative;
          perspective: 400px;
        }

        .format-convert:hover {
          animation: formatContainerShift 2.8s ease-in-out 1;
        }

        .format-convert:hover .logo-image {
          animation: formatImageConvert 2.8s ease-in-out 1;
        }

        .format-convert:hover .logo-letter {
          animation: formatLetterTransform 2.8s ease-in-out 1;
        }

        /* Staggered format conversion timing with slight randomness */
        .format-convert:hover .logo-letter:nth-child(1) { animation-delay: 0s; }
        .format-convert:hover .logo-letter:nth-child(2) { animation-delay: 0.05s; }
        .format-convert:hover .logo-letter:nth-child(3) { animation-delay: 0.12s; }
        .format-convert:hover .logo-letter:nth-child(4) { animation-delay: 0.08s; }
        .format-convert:hover .logo-letter:nth-child(5) { animation-delay: 0.18s; }
        .format-convert:hover .logo-letter:nth-child(6) { animation-delay: 0.03s; }
        .format-convert:hover .logo-letter:nth-child(7) { animation-delay: 0.15s; }
        .format-convert:hover .logo-letter:nth-child(8) { animation-delay: 0.09s; }
        .format-convert:hover .logo-letter:nth-child(9) { animation-delay: 0.06s; }

        @keyframes formatContainerShift {
          0%, 100% { 
            transform: rotateX(0deg) rotateY(0deg) translateZ(0);
            filter: hue-rotate(0deg);
          }
          20% { 
            transform: rotateX(5deg) rotateY(-3deg) translateZ(10px);
            filter: hue-rotate(30deg);
          }
          40% { 
            transform: rotateX(-3deg) rotateY(8deg) translateZ(15px);
            filter: hue-rotate(-20deg);
          }
          60% { 
            transform: rotateX(7deg) rotateY(-5deg) translateZ(12px);
            filter: hue-rotate(45deg);
          }
          80% { 
            transform: rotateX(-2deg) rotateY(3deg) translateZ(8px);
            filter: hue-rotate(-10deg);
          }
        }

        @keyframes formatImageConvert {
          0% { 
            transform: scale(1) rotateZ(0deg);
            filter: brightness(1) contrast(1) saturate(1);
            border-radius: 0%;
          }
          15% { 
            transform: scale(1.1) rotateZ(-5deg);
            filter: brightness(1.2) contrast(1.3) saturate(0.7);
            border-radius: 20%;
          }
          30% { 
            transform: scale(0.8) rotateZ(10deg);
            filter: brightness(0.8) contrast(1.5) saturate(1.5);
            border-radius: 50%;
          }
          45% { 
            transform: scale(1.3) rotateZ(-3deg);
            filter: brightness(1.4) contrast(0.9) saturate(1.2);
            border-radius: 30%;
          }
          60% { 
            transform: scale(0.9) rotateZ(8deg);
            filter: brightness(1.1) contrast(1.2) saturate(0.9);
            border-radius: 15%;
          }
          75% { 
            transform: scale(1.1) rotateZ(-2deg);
            filter: brightness(1.05) contrast(1.1) saturate(1.05);
            border-radius: 8%;
          }
          100% { 
            transform: scale(1) rotateZ(0deg);
            filter: brightness(1) contrast(1) saturate(1);
            border-radius: 0%;
          }
        }

        @keyframes formatLetterTransform {
          0% { 
            transform: scale(1) skew(0deg) rotateX(0deg);
            color: #ff6b35;
            font-weight: 600;
          }
          18% { 
            transform: scale(1.2) skew(5deg) rotateX(10deg);
            color: #4a90e2;
            font-weight: 300;
          }
          35% { 
            transform: scale(0.7) skew(-8deg) rotateX(-15deg);
            color: #7b68ee;
            font-weight: 800;
          }
          52% { 
            transform: scale(1.4) skew(3deg) rotateX(8deg);
            color: #ff4757;
            font-weight: 400;
          }
          68% { 
            transform: scale(0.9) skew(-4deg) rotateX(-5deg);
            color: #2ed573;
            font-weight: 700;
          }
          85% { 
            transform: scale(1.1) skew(1deg) rotateX(3deg);
            color: #ff7675;
            font-weight: 500;
          }
          100% { 
            transform: scale(1) skew(0deg) rotateX(0deg);
            color: #ff6b35;
            font-weight: 600;
          }
        }

        /* SEMANTIC SEARCH - Letters light up in search patterns with ID tagging */
        .semantic-search {
          position: relative;
          overflow: visible;
        }

        /* Search highlight overlay */
        .semantic-search::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          background: radial-gradient(
            circle,
            rgba(255, 215, 0, 0.1) 0%,
            rgba(255, 165, 0, 0.05) 40%,
            transparent 70%
          );
          border-radius: 12px;
          opacity: 0;
          pointer-events: none;
        }

        .semantic-search:hover::before {
          animation: searchAura 2.5s ease-in-out 1;
        }

        .semantic-search:hover .logo-image {
          animation: searchImageHighlight 2.5s ease-in-out 1;
        }

        .semantic-search:hover .logo-letter {
          animation: searchLetterPattern 2.5s ease-in-out 1;
        }

        /* Create ID tag pseudo-elements for letters */
        .semantic-search .logo-letter {
          position: relative;
        }

        .semantic-search .logo-letter::after {
          content: attr(data-id);
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 8px;
          color: #666;
          background: rgba(255, 255, 255, 0.9);
          padding: 1px 4px;
          border-radius: 3px;
          border: 1px solid #ddd;
          opacity: 0;
          pointer-events: none;
          font-weight: normal;
          white-space: nowrap;
        }

        .semantic-search:hover .logo-letter::after {
          animation: idTagAppear 2.5s ease-in-out 1;
        }

        /* Sequential search pattern with randomness */
        .semantic-search:hover .logo-letter:nth-child(1) { 
          animation-delay: 0s; 
        }
        .semantic-search:hover .logo-letter:nth-child(2) { 
          animation-delay: 0.15s; 
        }
        .semantic-search:hover .logo-letter:nth-child(3) { 
          animation-delay: 0.08s; 
        }
        .semantic-search:hover .logo-letter:nth-child(4) { 
          animation-delay: 0.22s; 
        }
        .semantic-search:hover .logo-letter:nth-child(5) { 
          animation-delay: 0.05s; 
        }
        .semantic-search:hover .logo-letter:nth-child(6) { 
          animation-delay: 0.18s; 
        }
        .semantic-search:hover .logo-letter:nth-child(7) { 
          animation-delay: 0.12s; 
        }
        .semantic-search:hover .logo-letter:nth-child(8) { 
          animation-delay: 0.25s; 
        }
        .semantic-search:hover .logo-letter:nth-child(9) { 
          animation-delay: 0.03s; 
        }

        /* ID tags with same staggered timing */
        .semantic-search:hover .logo-letter:nth-child(1)::after { animation-delay: 0.3s; }
        .semantic-search:hover .logo-letter:nth-child(2)::after { animation-delay: 0.45s; }
        .semantic-search:hover .logo-letter:nth-child(3)::after { animation-delay: 0.38s; }
        .semantic-search:hover .logo-letter:nth-child(4)::after { animation-delay: 0.52s; }
        .semantic-search:hover .logo-letter:nth-child(5)::after { animation-delay: 0.35s; }
        .semantic-search:hover .logo-letter:nth-child(6)::after { animation-delay: 0.48s; }
        .semantic-search:hover .logo-letter:nth-child(7)::after { animation-delay: 0.42s; }
        .semantic-search:hover .logo-letter:nth-child(8)::after { animation-delay: 0.55s; }
        .semantic-search:hover .logo-letter:nth-child(9)::after { animation-delay: 0.33s; }

        @keyframes searchAura {
          0%, 100% { 
            opacity: 0;
            transform: scale(0.8);
          }
          25% { 
            opacity: 0.3;
            transform: scale(1.1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.2);
          }
          75% { 
            opacity: 0.2;
            transform: scale(1.05);
          }
        }

        @keyframes searchImageHighlight {
          0% { 
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 transparent);
          }
          20% { 
            transform: scale(1.05);
            filter: brightness(1.3) drop-shadow(0 0 8px rgba(255, 215, 0, 0.4));
          }
          40% { 
            transform: scale(1.08);
            filter: brightness(1.5) drop-shadow(0 0 12px rgba(255, 165, 0, 0.6));
          }
          60% { 
            transform: scale(1.06);
            filter: brightness(1.2) drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));
          }
          80% { 
            transform: scale(1.02);
            filter: brightness(1.1) drop-shadow(0 0 4px rgba(255, 165, 0, 0.2));
          }
          100% { 
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 transparent);
          }
        }

        @keyframes searchLetterPattern {
          0% { 
            transform: scale(1);
            color: #ff6b35;
            background: transparent;
            text-shadow: none;
          }
          15% { 
            transform: scale(1.1);
            color: #ffd700;
            background: rgba(255, 215, 0, 0.2);
            text-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
          }
          30% { 
            transform: scale(1.15);
            color: #ffa500;
            background: rgba(255, 165, 0, 0.3);
            text-shadow: 0 0 10px rgba(255, 165, 0, 0.7);
          }
          45% { 
            transform: scale(1.08);
            color: #ffb347;
            background: rgba(255, 179, 71, 0.2);
            text-shadow: 0 0 8px rgba(255, 179, 71, 0.4);
          }
          60% { 
            transform: scale(1.04);
            color: #ff8c42;
            background: rgba(255, 140, 66, 0.15);
            text-shadow: 0 0 4px rgba(255, 140, 66, 0.3);
          }
          80% { 
            transform: scale(1.02);
            color: #ff7a47;
            background: rgba(255, 122, 71, 0.1);
            text-shadow: 0 0 2px rgba(255, 122, 71, 0.2);
          }
          100% { 
            transform: scale(1);
            color: #ff6b35;
            background: transparent;
            text-shadow: none;
          }
        }

        @keyframes idTagAppear {
          0%, 20% { 
            opacity: 0;
            transform: translateX(-50%) translateY(-5px) scale(0.5);
          }
          35% { 
            opacity: 0.8;
            transform: translateX(-50%) translateY(-15px) scale(1);
          }
          50% { 
            opacity: 1;
            transform: translateX(-50%) translateY(-20px) scale(1.1);
          }
          65% { 
            opacity: 0.9;
            transform: translateX(-50%) translateY(-18px) scale(1);
          }
          80% { 
            opacity: 0.5;
            transform: translateX(-50%) translateY(-12px) scale(0.8);
          }
          100% { 
            opacity: 0;
            transform: translateX(-50%) translateY(-5px) scale(0.5);
          }
        }

        /* Add content for ID tags via CSS (pseudo-attribute) */
        .semantic-search .logo-letter:nth-child(1)::after { content: 'S-01'; }
        .semantic-search .logo-letter:nth-child(2)::after { content: 'P-02'; }
        .semantic-search .logo-letter:nth-child(3)::after { content: 'I-03'; }
        .semantic-search .logo-letter:nth-child(4)::after { content: 'D-04'; }
        .semantic-search .logo-letter:nth-child(5)::after { content: 'E-05'; }
        .semantic-search .logo-letter:nth-child(6)::after { content: 'R-06'; }
        .semantic-search .logo-letter:nth-child(7)::after { content: 'Y-07'; }
        .semantic-search .logo-letter:nth-child(8)::after { content: 'A-08'; }
        .semantic-search .logo-letter:nth-child(9)::after { content: 'RN-09'; }

        /* ============================================== */
        /* AI SUMMARIES & HIERARCHICAL CONTENT ANIMATIONS */
        /* ============================================== */

        /* SUMMARY LAYERS - Information compresses into hierarchical layers, then expands */
        .summary-layers {
          position: relative;
          overflow: visible;
        }

        .summary-layers::before,
        .summary-layers::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 107, 53, 0.8) 20%, 
            rgba(255, 107, 53, 0.4) 50%, 
            rgba(255, 107, 53, 0.8) 80%, 
            transparent 100%);
          transform: translate(-50%, -50%) scaleX(0);
          opacity: 0;
          pointer-events: none;
        }

        .summary-layers::before {
          height: 1px;
        }

        .summary-layers::after {
          height: 3px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 107, 53, 0.6) 25%, 
            rgba(255, 107, 53, 0.2) 50%, 
            rgba(255, 107, 53, 0.6) 75%, 
            transparent 100%);
        }

        .summary-layers:hover::before {
          animation: summaryLayerThin 2s ease-in-out 1;
        }

        .summary-layers:hover::after {
          animation: summaryLayerThick 2s ease-in-out 1;
          animation-delay: 0.3s;
        }

        .summary-layers:hover .logo-image {
          animation: logoLayerCompress 2s ease-in-out 1;
        }

        .summary-layers:hover .logo-text {
          animation: textLayerExpand 2s ease-in-out 1;
        }

        @keyframes summaryLayerThin {
          0% { 
            transform: translate(-50%, -60%) scaleX(0);
            opacity: 0;
          }
          20% { 
            transform: translate(-50%, -60%) scaleX(0.3);
            opacity: 0.8;
          }
          40% { 
            transform: translate(-50%, -60%) scaleX(0.8);
            opacity: 1;
          }
          60% { 
            transform: translate(-50%, -60%) scaleX(1);
            opacity: 0.6;
          }
          80% { 
            transform: translate(-50%, -60%) scaleX(0.5);
            opacity: 0.3;
          }
          100% { 
            transform: translate(-50%, -60%) scaleX(0);
            opacity: 0;
          }
        }

        @keyframes summaryLayerThick {
          0% { 
            transform: translate(-50%, -40%) scaleX(0);
            opacity: 0;
          }
          15% { 
            transform: translate(-50%, -40%) scaleX(0.5);
            opacity: 0.6;
          }
          35% { 
            transform: translate(-50%, -40%) scaleX(1.2);
            opacity: 0.8;
          }
          55% { 
            transform: translate(-50%, -40%) scaleX(0.9);
            opacity: 0.4;
          }
          75% { 
            transform: translate(-50%, -40%) scaleX(0.3);
            opacity: 0.2;
          }
          100% { 
            transform: translate(-50%, -40%) scaleX(0);
            opacity: 0;
          }
        }

        @keyframes logoLayerCompress {
          0%, 100% { 
            transform: scale(1) translateY(0);
            filter: brightness(1);
          }
          25% { 
            transform: scale(0.8) translateY(-3px);
            filter: brightness(1.2);
          }
          50% { 
            transform: scale(0.6) translateY(-6px);
            filter: brightness(1.4);
          }
          75% { 
            transform: scale(0.9) translateY(-2px);
            filter: brightness(1.1);
          }
        }

        @keyframes textLayerExpand {
          0%, 100% { 
            transform: scaleY(1) scaleX(1);
            text-shadow: none;
          }
          20% { 
            transform: scaleY(0.7) scaleX(1.1);
            text-shadow: 0 -2px 4px rgba(255, 107, 53, 0.3);
          }
          40% { 
            transform: scaleY(0.4) scaleX(1.3);
            text-shadow: 0 -4px 8px rgba(255, 107, 53, 0.5);
          }
          60% { 
            transform: scaleY(0.6) scaleX(1.2);
            text-shadow: 0 -3px 6px rgba(255, 107, 53, 0.4);
          }
          80% { 
            transform: scaleY(0.8) scaleX(1.05);
            text-shadow: 0 -1px 2px rgba(255, 107, 53, 0.2);
          }
        }

        /* CONTENT CASCADE - Data flows from logo through letters in intelligent waves */
        .content-cascade {
          position: relative;
          overflow: visible;
        }

        .content-cascade::before {
          content: '◦ ◦ ◦ ◦ ◦';
          position: absolute;
          top: 50%;
          left: 45px;
          color: rgba(255, 107, 53, 0.7);
          font-size: 8px;
          letter-spacing: 8px;
          transform: translateY(-50%);
          opacity: 0;
          pointer-events: none;
        }

        .content-cascade:hover::before {
          animation: cascadeFlow 2.5s ease-out 1;
        }

        .content-cascade:hover .logo-image {
          animation: cascadeSource 2.5s ease-out 1;
        }

        .content-cascade:hover .logo-letter {
          animation: cascadeReceive 2.5s ease-out 1;
        }

        /* Staggered cascade for each letter */
        .content-cascade:hover .logo-letter:nth-child(1) { animation-delay: 0.2s; }
        .content-cascade:hover .logo-letter:nth-child(2) { animation-delay: 0.3s; }
        .content-cascade:hover .logo-letter:nth-child(3) { animation-delay: 0.4s; }
        .content-cascade:hover .logo-letter:nth-child(4) { animation-delay: 0.5s; }
        .content-cascade:hover .logo-letter:nth-child(5) { animation-delay: 0.6s; }
        .content-cascade:hover .logo-letter:nth-child(6) { animation-delay: 0.7s; }
        .content-cascade:hover .logo-letter:nth-child(7) { animation-delay: 0.8s; }
        .content-cascade:hover .logo-letter:nth-child(8) { animation-delay: 0.9s; }
        .content-cascade:hover .logo-letter:nth-child(9) { animation-delay: 1.0s; }

        @keyframes cascadeFlow {
          0% { 
            opacity: 0;
            transform: translateY(-50%) translateX(-20px) scale(0.5);
          }
          15% { 
            opacity: 0.8;
            transform: translateY(-50%) translateX(0px) scale(1);
          }
          30% { 
            opacity: 1;
            transform: translateY(-50%) translateX(20px) scale(1.2);
          }
          50% { 
            opacity: 0.9;
            transform: translateY(-50%) translateX(50px) scale(1.1);
          }
          70% { 
            opacity: 0.6;
            transform: translateY(-50%) translateX(80px) scale(0.9);
          }
          85% { 
            opacity: 0.3;
            transform: translateY(-50%) translateX(100px) scale(0.7);
          }
          100% { 
            opacity: 0;
            transform: translateY(-50%) translateX(120px) scale(0.5);
          }
        }

        @keyframes cascadeSource {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(255, 107, 53, 0));
          }
          20% { 
            transform: scale(1.1);
            filter: brightness(1.2) drop-shadow(0 0 6px rgba(255, 107, 53, 0.4));
          }
          40% { 
            transform: scale(1.15);
            filter: brightness(1.3) drop-shadow(0 0 12px rgba(255, 107, 53, 0.6));
          }
          60% { 
            transform: scale(1.08);
            filter: brightness(1.1) drop-shadow(0 0 8px rgba(255, 107, 53, 0.3));
          }
          80% { 
            transform: scale(1.02);
            filter: brightness(1.05) drop-shadow(0 0 4px rgba(255, 107, 53, 0.2));
          }
        }

        @keyframes cascadeReceive {
          0%, 100% { 
            transform: scale(1) translateY(0);
            color: #ff6b35;
            text-shadow: none;
          }
          50% { 
            transform: scale(1.05) translateY(-1px);
            color: #ff8a5a;
            text-shadow: 0 0 4px rgba(255, 107, 53, 0.5);
          }
          75% { 
            transform: scale(1.08) translateY(-2px);
            color: #ff7a47;
            text-shadow: 0 0 6px rgba(255, 107, 53, 0.6);
          }
          90% { 
            transform: scale(1.02) translateY(-0.5px);
            color: #ff6b35;
            text-shadow: 0 0 2px rgba(255, 107, 53, 0.3);
          }
        }

        /* GRANULARITY SHIFT - Elements shift between different detail levels and densities */
        .granularity-shift {
          position: relative;
          overflow: visible;
        }

        .granularity-shift:hover .logo-image {
          animation: granularityImageShift 2.2s ease-in-out 1;
        }

        .granularity-shift:hover .logo-letter {
          animation: granularityLetterShift 2.2s ease-in-out 1;
          display: inline-block;
        }

        /* Different granularity levels for each letter */
        .granularity-shift:hover .logo-letter:nth-child(odd) { 
          animation-name: granularityCoarse;
        }
        .granularity-shift:hover .logo-letter:nth-child(even) { 
          animation-name: granularityFine;
        }
        .granularity-shift:hover .logo-letter:nth-child(3n) { 
          animation-name: granularityDetailed;
        }

        /* Add density indicators */
        .granularity-shift::before {
          content: '█ ▓ ▒ ░';
          position: absolute;
          top: 30%;
          right: -30px;
          color: rgba(255, 107, 53, 0.6);
          font-size: 12px;
          line-height: 1;
          transform: rotate(90deg);
          opacity: 0;
          pointer-events: none;
        }

        .granularity-shift:hover::before {
          animation: densityIndicator 2.2s ease-in-out 1;
        }

        @keyframes granularityImageShift {
          0%, 100% { 
            transform: scale(1);
            filter: blur(0px) contrast(1) brightness(1);
          }
          20% { 
            transform: scale(0.7);
            filter: blur(0.5px) contrast(1.3) brightness(1.2);
          }
          40% { 
            transform: scale(0.4);
            filter: blur(1px) contrast(1.6) brightness(1.4);
          }
          60% { 
            transform: scale(0.8);
            filter: blur(0.3px) contrast(1.4) brightness(1.3);
          }
          80% { 
            transform: scale(1.2);
            filter: blur(0px) contrast(1.1) brightness(1.1);
          }
        }

        @keyframes granularityCoarse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
            filter: blur(0px);
          }
          25% { 
            transform: scale(1.3);
            opacity: 0.7;
            filter: blur(0.5px);
          }
          50% { 
            transform: scale(1.6);
            opacity: 0.4;
            filter: blur(1px);
          }
          75% { 
            transform: scale(1.2);
            opacity: 0.8;
            filter: blur(0.3px);
          }
        }

        @keyframes granularityFine {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
            font-weight: 600;
          }
          20% { 
            transform: scale(0.8);
            opacity: 0.9;
            font-weight: 500;
          }
          40% { 
            transform: scale(0.6);
            opacity: 0.7;
            font-weight: 400;
          }
          60% { 
            transform: scale(0.9);
            opacity: 0.8;
            font-weight: 500;
          }
          80% { 
            transform: scale(1.1);
            opacity: 0.95;
            font-weight: 700;
          }
        }

        @keyframes granularityDetailed {
          0%, 100% { 
            transform: scale(1) skewX(0deg);
            text-shadow: none;
            opacity: 1;
          }
          15% { 
            transform: scale(0.9) skewX(2deg);
            text-shadow: 1px 0 2px rgba(255, 107, 53, 0.3);
            opacity: 0.9;
          }
          30% { 
            transform: scale(0.7) skewX(-1deg);
            text-shadow: 2px 0 4px rgba(255, 107, 53, 0.5);
            opacity: 0.6;
          }
          45% { 
            transform: scale(0.5) skewX(1deg);
            text-shadow: 3px 0 6px rgba(255, 107, 53, 0.7);
            opacity: 0.3;
          }
          60% { 
            transform: scale(0.8) skewX(-0.5deg);
            text-shadow: 2px 0 4px rgba(255, 107, 53, 0.4);
            opacity: 0.7;
          }
          80% { 
            transform: scale(1.1) skewX(0deg);
            text-shadow: 1px 0 2px rgba(255, 107, 53, 0.2);
            opacity: 0.9;
          }
        }

        @keyframes densityIndicator {
          0% { 
            opacity: 0;
            transform: rotate(90deg) translateY(10px);
          }
          25% { 
            opacity: 0.8;
            transform: rotate(90deg) translateY(0px);
          }
          50% { 
            opacity: 1;
            transform: rotate(90deg) translateY(-5px);
          }
          75% { 
            opacity: 0.6;
            transform: rotate(90deg) translateY(0px);
          }
          100% { 
            opacity: 0;
            transform: rotate(90deg) translateY(10px);
          }
        }
      `}</style>
    </div>
  )
}
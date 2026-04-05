import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * "Feeling Lucky" Prompt Enhancement Tools
 * 
 * These tools use AI to automatically enhance user prompts for better results.
 * When a user clicks "I'm Feeling Lucky", their prompt is analyzed and improved
 * with additional context, examples, and formatting for optimal AI responses.
 */

const EnhancePromptSchema = z.object({
  originalPrompt: z.string().describe("The user's original prompt"),
  context: z.object({
    currentFile: z.string().optional().describe("Currently open file path"),
    selectedCode: z.string().optional().describe("Code currently selected in editor"),
    projectType: z.string().optional().describe("Type of project (React, Node.js, etc.)"),
    language: z.string().optional().describe("Programming language being used"),
  }).optional().describe("Context about the user's current state"),
  enhancementType: z.enum([
    "auto",
    "coding",
    "debugging",
    "refactoring",
    "learning",
    "documentation",
    "testing",
    "architecture"
  ]).default("auto").describe("Type of enhancement to apply"),
});

const AnalyzeIntentSchema = z.object({
  prompt: z.string().describe("The user's prompt to analyze"),
});

const GenerateExamplesSchema = z.object({
  topic: z.string().describe("Topic to generate examples for"),
  count: z.number().default(3).describe("Number of examples to generate"),
  complexity: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

const SuggestFollowUpSchema = z.object({
  originalPrompt: z.string().describe("The original user prompt"),
  aiResponse: z.string().describe("The AI's response to the prompt"),
  maxSuggestions: z.number().default(3).describe("Maximum number of suggestions"),
});

// Prompt enhancement templates
const ENHANCEMENT_TEMPLATES = {
  coding: (prompt: string, context: any) => `
# Enhanced Coding Request

## Original Request
${prompt}

## Context
${context.currentFile ? `- Current file: ${context.currentFile}` : ""}
${context.selectedCode ? `- Selected code:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ""}
${context.projectType ? `- Project type: ${context.projectType}` : ""}
${context.language ? `- Language: ${context.language}` : ""}

## Requirements
1. Provide clean, well-documented code
2. Follow best practices and conventions
3. Include error handling
4. Add type annotations where applicable
5. Optimize for readability and performance
6. Include usage examples

## Output Format
Please provide:
1. The complete solution
2. Explanation of key decisions
3. Testing suggestions
4. Potential edge cases to consider
`,

  debugging: (prompt: string, context: any) => `
# Debugging Request

## Problem Description
${prompt}

## Context
${context.currentFile ? `- File with issue: ${context.currentFile}` : ""}
${context.selectedCode ? `- Relevant code:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ""}

## Debugging Approach
Please help debug this issue by:
1. Identifying potential root causes
2. Suggesting diagnostic steps
3. Providing a fix if possible
4. Explaining why the error occurred
5. Suggesting prevention strategies

## Output Format
1. Root cause analysis
2. Step-by-step debugging guide
3. Proposed fix with code
4. Testing steps to verify the fix
5. Prevention tips
`,

  refactoring: (prompt: string, context: any) => `
# Code Refactoring Request

## Refactoring Goal
${prompt}

## Current Context
${context.currentFile ? `- Target file: ${context.currentFile}` : ""}
${context.selectedCode ? `- Code to refactor:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ""}
${context.projectType ? `- Project: ${context.projectType}` : ""}

## Refactoring Requirements
1. Maintain existing functionality
2. Improve code readability
3. Reduce complexity
4. Follow SOLID principles
5. Add/improve documentation
6. Ensure testability

## Output Format
1. Analysis of current code issues
2. Refactored code with explanations
3. Benefits of the refactoring
4. Migration steps if needed
5. Testing recommendations
`,

  learning: (prompt: string, context: any) => `
# Learning & Explanation Request

## Topic to Learn
${prompt}

## Context
${context.language ? `- Primary language: ${context.language}` : ""}
${context.projectType ? `- Project context: ${context.projectType}` : ""}

## Learning Goals
1. Explain concepts clearly
2. Provide practical examples
3. Connect to real-world applications
4. Suggest learning resources
5. Include common pitfalls

## Output Format
1. Core concept explanation
2. Visual/intuitive understanding
3. Code examples (beginner to advanced)
4. Common use cases
5. Further learning resources
6. Practice exercises
`,

  documentation: (prompt: string, context: any) => `
# Documentation Request

## Documentation Need
${prompt}

## Context
${context.currentFile ? `- File to document: ${context.currentFile}` : ""}
${context.selectedCode ? `- Code snippet:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ""}
${context.projectType ? `- Project: ${context.projectType}` : ""}

## Documentation Requirements
1. Clear and concise explanations
2. Include JSDoc/TSDoc comments
3. Add usage examples
4. Document parameters and return types
5. Note any side effects
6. Include edge cases

## Output Format
1. Complete documentation
2. Code examples
3. Usage instructions
4. API reference (if applicable)
`,

  testing: (prompt: string, context: any) => `
# Testing Request

## Testing Goal
${prompt}

## Code to Test
${context.selectedCode ? `\`\`\`\n${context.selectedCode}\n\`\`\`` : context.currentFile ? `File: ${context.currentFile}` : "Please provide the code to test"}

## Testing Requirements
1. Unit tests for core functionality
2. Edge case coverage
3. Error scenario tests
4. Integration tests if needed
5. Test organization best practices

## Output Format
1. Test strategy explanation
2. Complete test implementations
3. Mock/stub examples if needed
4. Coverage recommendations
5. CI/CD integration tips
`,

  architecture: (prompt: string, context: any) => `
# Architecture & Design Request

## Design Challenge
${prompt}

## Project Context
${context.projectType ? `- Project type: ${context.projectType}` : ""}
${context.language ? `- Primary language: ${context.language}` : ""}
${context.currentFile ? `- Current structure: ${context.currentFile}` : ""}

## Architecture Requirements
1. Scalability considerations
2. Maintainability and extensibility
3. Performance optimization
4. Security best practices
5. Technology stack recommendations

## Output Format
1. High-level architecture diagram (described)
2. Component breakdown
3. Data flow explanation
4. Technology recommendations
5. Implementation roadmap
6. Trade-off analysis
`,
};

// Auto-detect enhancement type based on prompt content
function detectEnhancementType(prompt: string): keyof typeof ENHANCEMENT_TEMPLATES {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("debug") || lower.includes("error") || lower.includes("fix") || lower.includes("bug")) {
    return "debugging";
  }
  if (lower.includes("refactor") || lower.includes("improve") || lower.includes("clean") || lower.includes("restructure")) {
    return "refactoring";
  }
  if (lower.includes("explain") || lower.includes("how to") || lower.includes("what is") || lower.includes("learn")) {
    return "learning";
  }
  if (lower.includes("document") || lower.includes("readme") || lower.includes("comment")) {
    return "documentation";
  }
  if (lower.includes("test") || lower.includes("spec") || lower.includes("jest") || lower.includes("vitest")) {
    return "testing";
  }
  if (lower.includes("architecture") || lower.includes("design") || lower.includes("structure") || lower.includes("pattern")) {
    return "architecture";
  }
  if (lower.includes("write") || lower.includes("create") || lower.includes("implement") || lower.includes("build")) {
    return "coding";
  }
  
  return "coding"; // default
}

export function createFeelingLuckyTools(): Tool[] {
  return [
    {
      name: "feeling_lucky_enhance",
      description: "Enhance a user prompt with additional context, examples, and formatting for optimal AI responses",
      parameters: EnhancePromptSchema,
      execute: async (args: unknown) => {
        const { originalPrompt, context = {}, enhancementType } = EnhancePromptSchema.parse(args);
        
        // Auto-detect if type is "auto"
        const detectedType = enhancementType === "auto" 
          ? detectEnhancementType(originalPrompt)
          : enhancementType;
        
        // Apply the appropriate template
        const template = ENHANCEMENT_TEMPLATES[detectedType];
        const enhancedPrompt = template(originalPrompt, context);
        
        return {
          success: true,
          originalPrompt,
          enhancedPrompt,
          detectedType,
          improvements: [
            "Added structured format for clearer responses",
            "Included context about current file/selection",
            "Specified output format requirements",
            "Added requirements and constraints",
          ],
        };
      },
    },
    {
      name: "feeling_lucky_analyze_intent",
      description: "Analyze the user's intent and suggest the best approach for their request",
      parameters: AnalyzeIntentSchema,
      execute: async (args: unknown) => {
        const { prompt } = AnalyzeIntentSchema.parse(args);
        
        const lower = prompt.toLowerCase();
        const intents: string[] = [];
        const confidence: Record<string, number> = {};
        
        // Detect multiple possible intents
        if (lower.includes("debug") || lower.includes("error")) {
          intents.push("debugging");
          confidence.debugging = 0.9;
        }
        if (lower.includes("write") || lower.includes("create") || lower.includes("implement")) {
          intents.push("code_generation");
          confidence.code_generation = 0.85;
        }
        if (lower.includes("explain") || lower.includes("how")) {
          intents.push("explanation");
          confidence.explanation = 0.8;
        }
        if (lower.includes("refactor") || lower.includes("improve")) {
          intents.push("refactoring");
          confidence.refactoring = 0.85;
        }
        if (lower.includes("test")) {
          intents.push("testing");
          confidence.testing = 0.9;
        }
        
        const primaryIntent = intents[0] || "general";
        
        return {
          success: true,
          prompt,
          detectedIntents: intents,
          primaryIntent,
          confidence,
          suggestions: [
            `This appears to be a "${primaryIntent}" request`,
            `Consider using "feeling_lucky_enhance" with type "${primaryIntent}"`,
          ],
        };
      },
    },
    {
      name: "feeling_lucky_examples",
      description: "Generate relevant code examples for a given topic",
      parameters: GenerateExamplesSchema,
      execute: async (args: unknown) => {
        const { topic, count, complexity } = GenerateExamplesSchema.parse(args);
        
        return {
          success: true,
          topic,
          complexity,
          note: "This tool provides metadata for example generation. The actual examples should be generated by the AI using the enhanced prompt.",
          exampleCount: count,
          suggestions: [
            `Generate ${count} ${complexity}-level examples for: ${topic}`,
            "Include progressive difficulty",
            "Add explanatory comments",
            "Show both good and bad practices",
          ],
        };
      },
    },
    {
      name: "feeling_lucky_followup",
      description: "Suggest follow-up questions or actions based on the conversation",
      parameters: SuggestFollowUpSchema,
      execute: async (args: unknown) => {
        const { originalPrompt, aiResponse, maxSuggestions } = SuggestFollowUpSchema.parse(args);
        
        // Analyze the response to suggest relevant follow-ups
        const suggestions: string[] = [];
        
        if (aiResponse.includes("code") || aiResponse.includes("function")) {
          suggestions.push("Can you explain how this code works line by line?");
          suggestions.push("How would you test this implementation?");
          suggestions.push("What are the edge cases I should handle?");
        }
        
        if (aiResponse.includes("error") || aiResponse.includes("exception")) {
          suggestions.push("What other errors might occur?");
          suggestions.push("How can I add better error handling?");
        }
        
        if (aiResponse.includes("performance") || aiResponse.includes("optimization")) {
          suggestions.push("Are there any trade-offs with this approach?");
          suggestions.push("How would this scale with larger inputs?");
        }
        
        // Add generic follow-ups if we don't have enough
        if (suggestions.length < maxSuggestions) {
          suggestions.push("Can you show me an alternative approach?");
          suggestions.push("How would you document this for other developers?");
        }
        
        return {
          success: true,
          originalPrompt,
          suggestions: suggestions.slice(0, maxSuggestions),
          suggestionCount: Math.min(suggestions.length, maxSuggestions),
        };
      },
    },
  ];
}

// Export the enhancement templates for use in other parts of the application
export { ENHANCEMENT_TEMPLATES, detectEnhancementType };

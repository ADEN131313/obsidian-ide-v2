import type { KnowledgeEntry, AgentLogger } from "./types.ts";

export class KnowledgeManagementSubsystem {
  private readonly logger: Required<AgentLogger>;
  private knowledge: KnowledgeEntry[] = [];

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
  }

  async storeKnowledge(
    content: string,
    source: string,
    tags: string[] = [],
  ): Promise<string> {
    const entry: KnowledgeEntry = {
      id: crypto.randomUUID(),
      content,
      source,
      timestamp: Date.now(),
      tags,
    };
    this.knowledge.push(entry);
    this.logger.info({ entryId: entry.id }, "Knowledge stored");
    return entry.id;
  }

  async queryKnowledge(query: string): Promise<KnowledgeEntry[]> {
    // Simple text search
    const results = this.knowledge.filter(
      (entry) =>
        entry.content.toLowerCase().includes(query.toLowerCase()) ||
        entry.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase()),
        ),
    );
    this.logger.debug(
      { query, resultsCount: results.length },
      "Knowledge queried",
    );
    return results;
  }

  async updateKnowledge(
    id: string,
    updates: Partial<KnowledgeEntry>,
  ): Promise<void> {
    const entry = this.knowledge.find((k) => k.id === id);
    if (entry) {
      Object.assign(entry, updates);
      this.logger.info({ entryId: id }, "Knowledge updated");
    }
  }

  async deleteKnowledge(id: string): Promise<void> {
    const index = this.knowledge.findIndex((k) => k.id === id);
    if (index !== -1) {
      this.knowledge.splice(index, 1);
      this.logger.info({ entryId: id }, "Knowledge deleted");
    }
  }

  getAllKnowledge(): KnowledgeEntry[] {
    return this.knowledge;
  }
}

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);

export interface PromptData {
  prompt: string;
  lastModified: string;
  version: string;
}

export class PromptService {
  private static instance: PromptService;
  private promptCache: PromptData | null = null;
  private promptFilePath: string;
  private fileWatcher: fs.FSWatcher | null = null;

  private constructor() {
    // Store prompt file in a 'prompts' directory within the project
    this.promptFilePath = path.join(process.cwd(), 'prompts', 'ai-assistant.txt');
    this.initializePromptFile();
    this.loadPromptFromFile();
    this.watchPromptFile();
  }

  public static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * Initialize prompt file with default content if it doesn't exist
   */
  private async initializePromptFile(): Promise<void> {
    try {
      const promptsDir = path.dirname(this.promptFilePath);

      // Create prompts directory if it doesn't exist
      if (!fs.existsSync(promptsDir)) {
        fs.mkdirSync(promptsDir, { recursive: true });
        console.log('Created prompts directory:', promptsDir);
      }

      // Create default prompt file if it doesn't exist
      if (!fs.existsSync(this.promptFilePath)) {
        const defaultPrompt = this.getDefaultPrompt();
        await writeFile(this.promptFilePath, defaultPrompt, 'utf-8');
        console.log('Created default AI assistant prompt file:', this.promptFilePath);
      }
    } catch (error) {
      console.error('Error initializing prompt file:', error);
    }
  }

  /**
   * Load prompt from file system
   */
  private async loadPromptFromFile(): Promise<void> {
    try {
      const promptContent = await readFile(this.promptFilePath, 'utf-8');
      const stats = fs.statSync(this.promptFilePath);

      this.promptCache = {
        prompt: promptContent,
        lastModified: stats.mtime.toISOString(),
        version: '1.0.0'
      };

      console.log('Loaded AI assistant prompt from file (length:', promptContent.length, 'characters)');
    } catch (error) {
      console.error('Error loading prompt from file:', error);
      // Use default prompt as fallback
      this.promptCache = {
        prompt: this.getDefaultPrompt(),
        lastModified: new Date().toISOString(),
        version: '1.0.0'
      };
    }
  }

  /**
   * Watch prompt file for changes
   */
  private watchPromptFile(): void {
    try {
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }

      this.fileWatcher = fs.watch(this.promptFilePath, (eventType) => {
        if (eventType === 'change') {
          console.log('Prompt file changed, reloading...');
          this.loadPromptFromFile();
        }
      });

      console.log('Watching prompt file for changes:', this.promptFilePath);
    } catch (error) {
      console.error('Error setting up file watcher:', error);
    }
  }

  /**
   * Get the current prompt
   */
  public async getPrompt(): Promise<PromptData> {
    if (!this.promptCache) {
      await this.loadPromptFromFile();
    }

    if (!this.promptCache) {
      throw new Error('Failed to load prompt');
    }

    return this.promptCache;
  }

  /**
   * Reload prompt from file (useful after external changes)
   */
  public async reloadPrompt(): Promise<PromptData> {
    await this.loadPromptFromFile();

    if (!this.promptCache) {
      throw new Error('Failed to reload prompt');
    }

    console.log('Prompt reloaded successfully');
    return this.promptCache;
  }

  /**
   * Get file path for external editing
   */
  public getPromptFilePath(): string {
    return this.promptFilePath;
  }

  /**
   * Default prompt to use if file doesn't exist
   */
  private getDefaultPrompt(): string {
    return `You are an AI assistant. Please provide helpful, accurate, and relevant responses to user queries.

When you receive "start chat", introduce yourself briefly.

Remember to:
- Be concise and direct
- Provide accurate information
- Be helpful and professional
- Respond naturally in conversation`;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }
}

// Export singleton instance
export const promptService = PromptService.getInstance();
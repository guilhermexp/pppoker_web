// Slack integration config
export interface SlackConfig {
  access_token: string;
  bot_user_id: string;
  channel_id: string;
  channel_name?: string;
  team_id?: string;
  team_name?: string;
}

// Document/vault metadata
export interface DocumentMetadata {
  size?: number;
  mimetype?: string;
  [key: string]: unknown;
}

// Generic validation results for imports
export interface ValidationError {
  rule: string;
  message: string;
  row?: number;
  column?: string;
  severity?: "error" | "warning";
}

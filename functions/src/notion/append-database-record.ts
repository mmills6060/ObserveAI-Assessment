import {Client} from "@notionhq/client";
import {AppError} from "../errors";

export interface AppendNotionDatabaseRecordOptions {
  notionToken: string;
  name: string;
  summary: string;
  sentiment: string;
  timestamp: string;
}

export interface AppendedNotionDatabaseRecord {
  id: string;
  url: string | null;
}

const notionDatabaseId = "35f1d300-a724-8090-8ab7-de360cf72bc4";

/**
 * Appends a new page to the configured Notion database.
 */
export async function appendNotionDatabaseRecord({
  notionToken,
  name,
  summary,
  sentiment,
  timestamp,
}: AppendNotionDatabaseRecordOptions): Promise<AppendedNotionDatabaseRecord> {
  if (!notionToken) {
    throw new AppError({
      code: "missing_notion_token",
      message: "Missing Notion token",
      statusCode: 500,
    });
  }

  if (!name) {
    throw new AppError({
      code: "missing_name",
      message: "Missing name",
      statusCode: 400,
    });
  }

  if (!summary) {
    throw new AppError({
      code: "missing_summary",
      message: "Missing summary",
      statusCode: 400,
    });
  }

  if (!sentiment) {
    throw new AppError({
      code: "missing_sentiment",
      message: "Missing sentiment",
      statusCode: 400,
    });
  }

  if (!timestamp) {
    throw new AppError({
      code: "missing_timestamp",
      message: "Missing timestamp",
      statusCode: 400,
    });
  }

  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new AppError({
      code: "invalid_timestamp",
      message: "Timestamp must be a valid date string",
      statusCode: 422,
    });
  }

  const notion = new Client({auth: notionToken});
  const response = await notion.pages.create({
    parent: {
      database_id: notionDatabaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: name,
            },
          },
        ],
      },
      Summary: {
        rich_text: [
          {
            text: {
              content: summary,
            },
          },
        ],
      },
      Sentiment: {
        rich_text: [
          {
            text: {
              content: sentiment,
            },
          },
        ],
      },
      Timestamp: {
        date: {
          start: parsedTimestamp.toISOString(),
        },
      },
    },
  });

  return {
    id: response.id,
    url: "url" in response ? response.url : null,
  };
}

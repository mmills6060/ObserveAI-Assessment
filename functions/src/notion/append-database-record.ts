import {Client} from "@notionhq/client";

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
  if (!notionToken) throw new Error("Missing Notion token");
  if (!name) throw new Error("Missing name");
  if (!summary) throw new Error("Missing summary");
  if (!sentiment) throw new Error("Missing sentiment");
  if (!timestamp) throw new Error("Missing timestamp");

  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    throw new TypeError("Invalid timestamp");
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

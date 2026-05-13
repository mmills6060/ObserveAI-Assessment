import { Client } from "@notionhq/client"

export interface GetNotionDatabaseRecordOptions {
  notionToken?: string
  pageId: string
}

type NotionDatabaseRecord = Awaited<ReturnType<Client["pages"]["retrieve"]>>

function createNotionClient(notionToken: string): Client {
  return new Client({ auth: notionToken })
}

export async function getNotionDatabaseRecord({
  notionToken = process.env.NOTION_TOKEN,
  pageId,
}: GetNotionDatabaseRecordOptions): Promise<NotionDatabaseRecord> {
  if (!notionToken) throw new Error("Missing NOTION_TOKEN environment variable")
  if (!pageId) throw new Error("Missing Notion page ID")

  const notion = createNotionClient(notionToken)

  return notion.pages.retrieve({ page_id: pageId })
}

import {Client} from "@notionhq/client";

export interface GetNotionDatabaseRecordOptions {
  notionToken: string;
  phoneNumber: string;
}

const notionDatabaseId = "35f1d300-a724-807f-aaa0-fbfe0a1435d5";
const phoneNumberPropertyName = "Phone Number";

type NotionDatabaseRecord = Awaited<
  ReturnType<Client["dataSources"]["query"]>
>["results"][number];

/**
 * Resolves the first data source ID from the fixed Notion database.
 *
 * @param {Client} notion Authenticated Notion client.
 * @return {Promise<string>} Data source ID used for queries.
 */
async function getDataSourceId(notion: Client): Promise<string> {
  const database = await notion.databases.retrieve({
    database_id: notionDatabaseId,
  });

  if (!("data_sources" in database) || !database.data_sources[0]) {
    throw new Error("Notion database has no data sources");
  }

  return database.data_sources[0].id;
}

/**
 * Finds the first Notion database record with a matching phone number.
 */
export async function getNotionDatabaseRecord({
  notionToken,
  phoneNumber,
}: GetNotionDatabaseRecordOptions): Promise<NotionDatabaseRecord | null> {
  if (!notionToken) throw new Error("Missing Notion token");
  if (!phoneNumber) throw new Error("Missing phone number");

  const notion = new Client({auth: notionToken});
  const dataSourceId = await getDataSourceId(notion);

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      property: phoneNumberPropertyName,
      phone_number: {
        equals: phoneNumber,
      },
    },
    page_size: 1,
    result_type: "page",
  });

  return response.results[0] ?? null;
}

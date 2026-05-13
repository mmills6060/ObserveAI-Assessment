import {Client} from "@notionhq/client";

export interface GetNotionDatabaseRecordOptions {
  notionToken: string;
  phoneNumber: string;
}

export interface NotionClaimRecord {
  claimStatus: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

const notionDatabaseId = "35f1d300-a724-807f-aaa0-fbfe0a1435d5";
const phoneNumberPropertyName = "Phone Number";

type NotionDatabaseRecord = Awaited<
  ReturnType<Client["dataSources"]["query"]>
>["results"][number];

type NotionProperty = Extract<
  NotionDatabaseRecord,
  {properties: Record<string, unknown>}
>["properties"][string];

/**
 * Checks whether a Notion property option exposes a name.
 *
 * @param {unknown} value Notion property option value.
 * @return {boolean} Whether the option has a name field.
 */
function hasNamedValue(
  value: unknown
): value is {name?: string | null} {
  return typeof value === "object" && value !== null && "name" in value;
}

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
 * Converts supported Notion property values to plain text.
 *
 * @param {NotionProperty | undefined} property Notion property value.
 * @return {string | null} Plain text value.
 */
function getTextProperty(property: NotionProperty | undefined): string | null {
  if (!property) return null;

  if (property.type === "title") {
    return property.title.map((item) => item.plain_text).join("") || null;
  }

  if (property.type === "rich_text") {
    return property.rich_text.map((item) => item.plain_text).join("") || null;
  }

  if (
    property.type === "phone_number" &&
    typeof property.phone_number === "string"
  ) {
    return property.phone_number;
  }

  if (property.type === "select" && hasNamedValue(property.select)) {
    return property.select.name ?? null;
  }

  if (property.type === "status" && hasNamedValue(property.status)) {
    return property.status.name ?? null;
  }

  return null;
}

/**
 * Formats a Notion page into the claim response contract.
 *
 * @param {NotionDatabaseRecord} record Matching Notion database record.
 * @return {NotionClaimRecord} Public claim record fields.
 */
function formatClaimRecord(record: NotionDatabaseRecord): NotionClaimRecord {
  if (!("properties" in record)) {
    throw new Error("Notion returned a partial record without properties");
  }

  return {
    claimStatus: getTextProperty(record.properties["Claim Status"]),
    firstName: getTextProperty(record.properties["First Name"]),
    lastName: getTextProperty(record.properties["Last Name"]),
    phoneNumber: getTextProperty(record.properties["Phone Number"]),
  };
}

/**
 * Finds the first Notion database record with a matching phone number.
 */
export async function getNotionDatabaseRecord({
  notionToken,
  phoneNumber,
}: GetNotionDatabaseRecordOptions): Promise<NotionClaimRecord | null> {
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

  const record = response.results[0];

  if (!record) return null;

  return formatClaimRecord(record);
}

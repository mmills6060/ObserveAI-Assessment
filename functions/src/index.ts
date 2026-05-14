/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {defineSecret} from "firebase-functions/params";
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {AppError, ErrorResponseBody, toErrorResponse} from "./errors";
import {appendNotionDatabaseRecord} from "./notion/append-database-record";
import {getNotionDatabaseRecord} from "./notion/get-database-record";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

const notionToken = defineSecret("NOTION_TOKEN");
const jsonContentType = "application/json";

interface AppendNotionRecordRequestBody {
  name?: unknown;
  summary?: unknown;
  sentiment?: unknown;
  timestamp?: unknown;
}

interface JsonResponse {
  status(statusCode: number): {
    json(body: ErrorResponseBody): void;
  };
}

/**
 * Sends a normalized JSON error response.
 *
 * @param {JsonResponse} response HTTP response object.
 * @param {unknown} error Error to convert.
 * @param {string} fallbackMessage Message for unexpected failures.
 */
function sendErrorResponse(
  response: JsonResponse,
  error: unknown,
  fallbackMessage: string
): void {
  const errorResponse = toErrorResponse(error, fallbackMessage);

  response.status(errorResponse.statusCode).json(errorResponse.body);
}

export const getNotionRecord = onRequest(
  {secrets: [notionToken]},
  async (request, response) => {
    response.setHeader("Content-Type", jsonContentType);

    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      sendErrorResponse(
        response,
        new AppError({
          code: "method_not_allowed",
          message: "Method not allowed",
          statusCode: 405,
        }),
        "Failed to get Notion record"
      );
      return;
    }

    const phoneNumber = request.query.phoneNumber;

    if (typeof phoneNumber !== "string" || !phoneNumber) {
      sendErrorResponse(
        response,
        new AppError({
          code: "missing_phone_number",
          message: "Missing phoneNumber query parameter",
          statusCode: 400,
        }),
        "Failed to get Notion record"
      );
      return;
    }

    try {
      const record = await getNotionDatabaseRecord({
        notionToken: notionToken.value(),
        phoneNumber,
      });

      if (!record) {
        sendErrorResponse(
          response,
          new AppError({
            code: "notion_record_not_found",
            message: "No matching Notion record found",
            statusCode: 404,
          }),
          "Failed to get Notion record"
        );
        return;
      }

      response.status(200).json(record);
    } catch (error) {
      logger.error("Failed to get Notion record", error);
      sendErrorResponse(response, error, "Failed to get Notion record");
    }
  }
);

export const appendNotionRecord = onRequest(
  {secrets: [notionToken]},
  async (request, response) => {
    response.setHeader("Content-Type", jsonContentType);

    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendErrorResponse(
        response,
        new AppError({
          code: "method_not_allowed",
          message: "Method not allowed",
          statusCode: 405,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    if (!request.is(jsonContentType)) {
      sendErrorResponse(
        response,
        new AppError({
          code: "unsupported_media_type",
          message: "Content-Type must be application/json",
          statusCode: 415,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    const {name, summary, sentiment, timestamp} =
      request.body as AppendNotionRecordRequestBody;

    if (typeof name !== "string" || !name) {
      sendErrorResponse(
        response,
        new AppError({
          code: "missing_name",
          message: "Missing name",
          statusCode: 400,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    if (typeof summary !== "string" || !summary) {
      sendErrorResponse(
        response,
        new AppError({
          code: "missing_summary",
          message: "Missing summary",
          statusCode: 400,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    if (typeof sentiment !== "string" || !sentiment) {
      sendErrorResponse(
        response,
        new AppError({
          code: "missing_sentiment",
          message: "Missing sentiment",
          statusCode: 400,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    if (typeof timestamp !== "string" || !timestamp) {
      sendErrorResponse(
        response,
        new AppError({
          code: "missing_timestamp",
          message: "Missing timestamp",
          statusCode: 400,
        }),
        "Failed to append Notion record"
      );
      return;
    }

    try {
      const record = await appendNotionDatabaseRecord({
        notionToken: notionToken.value(),
        name,
        summary,
        sentiment,
        timestamp,
      });

      response.status(201).json(record);
    } catch (error) {
      logger.error("Failed to append Notion record", error);
      sendErrorResponse(response, error, "Failed to append Notion record");
    }
  }
);

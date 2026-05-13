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

export const getNotionRecord = onRequest(
  {secrets: [notionToken]},
  async (request, response) => {
    if (request.method !== "GET") {
      response.status(405).json({error: "Method not allowed"});
      return;
    }

    const phoneNumber = request.query.phoneNumber;

    if (typeof phoneNumber !== "string" || !phoneNumber) {
      response.status(400).json({
        error: "Missing phoneNumber query parameter",
      });
      return;
    }

    try {
      const record = await getNotionDatabaseRecord({
        notionToken: notionToken.value(),
        phoneNumber,
      });

      if (!record) {
        response.status(404).json({
          error: "No matching Notion record found",
        });
        return;
      }

      response.status(200).json(record);
    } catch (error) {
      logger.error("Failed to get Notion record", error);
      response.status(500).json({error: "Failed to get Notion record"});
    }
  }
);

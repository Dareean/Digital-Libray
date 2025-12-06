import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";

interface BookRequestPayload {
  title: string;
  authors: string[];
  reason?: string;
  externalLink?: string;
  additionalNotes?: string;
  requesterName?: string;
  requesterEmail?: string;
}

type RequestStatus = "pending" | "approved" | "rejected";

interface BookRequestRecord extends BookRequestPayload {
  id: string;
  status: RequestStatus;
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

const BOOK_REQUESTS: Record<string, BookRequestRecord> = {};
let nextRequestId = 1;

const sanitizeAuthors = (authors: string[] | undefined) =>
  Array.isArray(authors)
    ? authors.map((author) => String(author).trim()).filter(Boolean)
    : [];

export default class RequestsController {
  public async index({ response }: HttpContextContract) {
    const data = Object.values(BOOK_REQUESTS).sort(
      (left, right) => right.createdAt - left.createdAt
    );

    return response.ok({ data, meta: { total: data.length } });
  }

  public async store({ request, response, apiToken }: HttpContextContract) {
    const payload = request.only([
      "title",
      "authors",
      "reason",
      "externalLink",
      "additionalNotes",
      "requesterName",
      "requesterEmail",
    ]) as BookRequestPayload;

    const title = (payload.title || "").trim();
    if (!title) {
      return response.badRequest({ message: "title is required" });
    }

    const authors = sanitizeAuthors(payload.authors);
    const id = String(nextRequestId++);
    const record: BookRequestRecord = {
      id,
      title,
      authors,
      reason: (payload.reason || "").trim(),
      additionalNotes: (payload.additionalNotes || "").trim(),
      externalLink: (payload.externalLink || "").trim(),
      requesterName:
        (payload.requesterName || "").trim() || apiToken?.owner || "unknown",
      requesterEmail: (payload.requesterEmail || "").trim(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    BOOK_REQUESTS[id] = record;
    return response.created(record);
  }

  public async update({ params, request, response }: HttpContextContract) {
    const record = BOOK_REQUESTS[params.id];
    if (!record) {
      return response.notFound({ message: "Request not found" });
    }

    const { status, adminNote } = request.only(["status", "adminNote"]) as {
      status?: RequestStatus;
      adminNote?: string;
    };

    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return response.badRequest({ message: "Invalid status value" });
    }

    BOOK_REQUESTS[params.id] = {
      ...record,
      status: status || record.status,
      adminNote: adminNote !== undefined ? adminNote : record.adminNote,
      updatedAt: Date.now(),
    };

    return response.ok(BOOK_REQUESTS[params.id]);
  }

  public async destroy({ params, response }: HttpContextContract) {
    const record = BOOK_REQUESTS[params.id];
    if (!record) {
      return response.notFound({ message: "Request not found" });
    }

    delete BOOK_REQUESTS[params.id];
    return response.ok({ message: "Deleted" });
  }
}

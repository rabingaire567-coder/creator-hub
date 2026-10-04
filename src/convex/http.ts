import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { api } from "./_generated/api";
import { uploadHomepageImage } from "./site";

const http = httpRouter();

auth.addHttpRoutes(http);

// ---- Homepage image upload ----
// Convex HTTP route that accepts the uploaded file, validates it server-side,
// and returns a permanent image URL. The file is handed through `runAction`
// into the upload action so `requireAdmin` still applies and no storage
// credentials or service-role keys are exposed.
http.route({
  path: "/api.site.uploadHomepageImage",
  method: "POST",
  handler: async (request: Request): Promise<Response> => {
    // Convex HTTP route handlers expose `runAction` and the `api` namespace
    // on the request context when the router is wired with auth.addHttpRoutes.
    const body = request as unknown as {
      runAction: (action: unknown, args: unknown) => Promise<unknown>;
      api: { site: { uploadHomepageImage: typeof uploadHomepageImage } };
    };
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "No file uploaded." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await body.runAction(body.api.site.uploadHomepageImage, { file });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

export default http;

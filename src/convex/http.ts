import { httpRouter, httpAction } from "./_generated/server";
import { auth } from "./auth";
import { uploadHomepageImage } from "./site";

const http = httpRouter();

auth.addHttpRoutes(http);

// ---- Homepage image upload ----
// A Convex HTTP action (the project's only server-webhook hook) that accepts
// the uploaded file, validates it, and returns a permanent image URL.
// The action itself enforces admin access via requireAdmin.
http.route({
  path: "/api.site.uploadHomepageImage",
  method: "POST",
  handler: httpAction(async ({ runAction }, request) => {
    // Read the file from the multipart body.
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file uploaded." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await runAction(api.site.uploadHomepageImage, { file });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

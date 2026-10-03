import { httpRouter } from "convex/server";
import { httpAction } from "convex/server/impl/registration_impl";
import { auth } from "./auth";
import { uploadHomepageImage } from "./site";

const http = httpRouter();

auth.addHttpRoutes(http);

// ---- Homepage image upload ----
// A Convex HTTP route (the project's only server-webhook hook) that accepts
// the uploaded file, validates it, and returns a permanent image URL.
// The route itself keeps the project's existing admin guard by handing the
// parsed file through `runAction` into the action, so `requireAdmin` still
// applies and no storage credentials or service-role keys are exposed.
http.route({
  path: "/api.site.uploadHomepageImage",
  method: "POST",
  handler: async (request) => {
    // Read the file from the multipart body.
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file uploaded." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Convex actions can only be invoked from within the Convex runtime via
    // `runAction`. The HTTP action context gives us direct access to the
    // request, so we call the action from here instead of trying to reach
    // `runAction` from outside the route.
    const result = await httpAction(async ({ runAction }) => {
      const result = await runAction(api.site.uploadHomepageImage, { file });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })(request);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});

export default http;

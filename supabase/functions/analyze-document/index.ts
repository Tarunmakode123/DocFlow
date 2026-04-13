import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert at analyzing Indian engineering college project document templates. 
You will receive the text content of a single page from a .docx file.

Your job is to identify every field a student needs to fill in. These are typically:
- Student personal info: Name, Roll Number, Enrollment Number, SAP ID, PRN
- Academic info: Branch/Department, Division, Class, Semester (1–8), Academic Year (e.g. 2024–25)
- Course info: Subject Name, Subject Code, Course Name
- Project info: Project Title, Project Description
- Faculty info: Guide Name, HOD Name, Principal Name, External Examiner Name
- Institution: College Name, University Name
- Dates: Submission Date, Declaration Date, Exam Date
- Signatures and declaration checkboxes
- Content sections: Abstract, Introduction, Methodology, Literature Survey, etc. (these are large text areas where students write content)
- Image placeholders: College Logo, Student Photo, Signature, Project Screenshot, etc. (places where an image needs to be inserted)

Return ONLY a valid JSON array. No markdown. No explanation. No preamble.

Each object must have:
{
  "id": "unique_snake_case_id",
  "label": "Human readable label",
  "type": "text" | "date" | "select" | "textarea" | "number" | "image",
  "placeholder": "Example value for this field",
  "required": true | false,
  "pageNumber": <integer>,
  "category": "personal" | "academic" | "project" | "faculty" | "institution" | "date" | "content" | "image",
  "globalKey": "normalized_key_for_cross_page_grouping",
  "detectHint": "The exact text string in the document that represents this placeholder",
  "wordLimit": null | { "min": number, "max": number },
  "imageHint": null | { "type": "logo" | "photo" | "signature" | "screenshot" | "other", "suggestedWidth": number, "suggestedHeight": number }
}

IMPORTANT RULES:
- For section headings like "Abstract", "Introduction", "Methodology" etc., detect them as textarea fields with category "content"
- For content sections, set wordLimit based on any instructions found (e.g. "100-200 words")
- Use "textarea" type for any field that expects more than a single line of text
- Use "image" type for placeholders like "[LOGO]", "[Photo]", "[Signature]", "College Logo", "Student Photo", "Insert Logo Here", or any area clearly meant for an image
- For image fields, set imageHint with type and suggested dimensions in centimeters: logo=3x3, photo=2.5x3.5, signature=4x1.5, screenshot=12x8
- Common image globalKeys: college_logo, student_photo, student_signature, project_screenshot
- The "globalKey" field is critical — use consistent keys across pages so the same logical field maps to a single user input
- Common globalKeys: student_name, roll_number, enrollment_number, department, semester, academic_year, subject_name, project_title, guide_name, college_name, submission_date
- If a page has NO fillable fields (e.g. table of contents, bibliography), return []`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId, pageTexts } = await req.json();

    if (!documentId || !pageTexts || !Array.isArray(pageTexts)) {
      return new Response(JSON.stringify({ error: "documentId and pageTexts[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
    const GEMINI_MODEL = "gemini-2.5-flash";

    const allFields: any[] = [];
    const errors: any[] = [];
    const cacheEntries: any[] = [];

    // Process pages in batches of 3
    for (let i = 0; i < pageTexts.length; i += 3) {
      const batch = pageTexts.slice(i, i + 3);
      const promises = batch.map(async (pageText: string, batchIndex: number) => {
        const pageNumber = i + batchIndex + 1;
        let lastError = "";

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `${SYSTEM_PROMPT}\n\nPage ${pageNumber} content:\n\n${pageText}`,
                      },
                    ],
                  },
                ],
              }),
            });

            if (response.status === 429) { lastError = "Rate limited"; continue; }
            if (response.status === 402) throw new Error("AI credits exhausted.");
            if (!response.ok) { lastError = `AI gateway error: ${response.status}`; continue; }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

            let jsonStr = content.trim();
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }

            const fields = JSON.parse(jsonStr);
            if (Array.isArray(fields)) {
              // Cache the raw analysis result
              cacheEntries.push({
                document_id: documentId,
                page_number: pageNumber,
                fields_json: fields,
                raw_page_text: pageText,
                analysis_status: "success",
                claude_model: GEMINI_MODEL,
                tokens_used: tokensUsed,
              });

              for (const field of fields) {
                allFields.push({
                  document_id: documentId,
                  page_number: pageNumber,
                  field_id: field.id || `page${pageNumber}_field_${allFields.length}`,
                  global_key: field.globalKey || field.id,
                  label: field.label,
                  field_type: field.type || "text",
                  is_required: field.required !== false,
                  order_index: allFields.length,
                  category: field.category || "personal",
                  detect_hint: field.detectHint || null,
                  select_options: field.type === "select" ? field.options : null,
                });
              }
              return;
            }
          } catch (parseErr) {
            lastError = parseErr.message;
          }
        }

        // All retries failed
        errors.push({ document_id: documentId, page_number: pageNumber, error_message: lastError });
        cacheEntries.push({
          document_id: documentId,
          page_number: pageNumber,
          fields_json: [],
          raw_page_text: pageText,
          analysis_status: "failed",
          error_message: lastError,
                claude_model: GEMINI_MODEL,
          tokens_used: 0,
        });
      });

      await Promise.all(promises);
    }

    // Insert fields
    if (allFields.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("document_fields").insert(allFields);
      if (insertError) console.error("Insert fields error:", insertError);
    }

    // Insert cached analysis
    if (cacheEntries.length > 0) {
      const { error: cacheError } = await supabaseAdmin.from("cached_analysis").insert(cacheEntries);
      if (cacheError) console.error("Insert cache error:", cacheError);
    }

    // Insert errors
    if (errors.length > 0) {
      await supabaseAdmin.from("analysis_errors").insert(errors);
    }

    // Update document status
    await supabaseAdmin
      .from("documents")
      .update({
        status: errors.length === pageTexts.length ? "error" : "analyzed",
        total_pages: pageTexts.length,
      })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({ totalFields: allFields.length, totalPages: pageTexts.length, errors: errors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

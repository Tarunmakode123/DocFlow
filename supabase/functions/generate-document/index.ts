import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default image dimensions in EMU (1cm = 360000 EMU)
const IMAGE_DEFAULTS: Record<string, { w: number; h: number }> = {
  logo: { w: 1080000, h: 1080000 },       // 3cm x 3cm
  photo: { w: 900000, h: 1260000 },       // 2.5cm x 3.5cm
  signature: { w: 1440000, h: 540000 },   // 4cm x 1.5cm
  screenshot: { w: 4320000, h: 2880000 }, // 12cm x 8cm
  other: { w: 1800000, h: 1800000 },      // 5cm x 5cm
};

function getImageType(data: Uint8Array): string {
  if (data[0] === 0x89 && data[1] === 0x50) return "png";
  if (data[0] === 0xFF && data[1] === 0xD8) return "jpeg";
  if (data[0] === 0x47 && data[1] === 0x49) return "gif";
  return "png";
}

function buildImageXml(rId: string, cx: number, cy: number, name: string): string {
  return `<w:r><w:rPr></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="${name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get document
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents").select("*").eq("id", documentId).single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access
    if (doc.user_id !== user.id) {
      const { data: studentDoc } = await supabaseAdmin
        .from("student_documents").select("id")
        .eq("source_document_id", documentId).eq("student_id", user.id).maybeSingle();
      if (!studentDoc) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Get fields and responses
    const [fieldsRes, responsesRes] = await Promise.all([
      supabaseAdmin.from("document_fields").select("*").eq("document_id", documentId),
      supabaseAdmin.from("field_responses").select("*").eq("document_id", documentId).eq("user_id", user.id),
    ]);

    const responseMap: Record<string, string> = {};
    if (responsesRes.data) {
      responsesRes.data.forEach((r: any) => { responseMap[r.field_id] = r.value || ""; });
    }

    // Separate text replacements and image insertions
    const textReplacements: Array<{ hint: string; value: string }> = [];
    const imageInsertions: Array<{ hint: string; storagePath: string; fieldType: string; field: any }> = [];

    if (fieldsRes.data) {
      fieldsRes.data.forEach((field: any) => {
        const value = responseMap[field.field_id];
        if (!value || !field.detect_hint) return;

        if (field.field_type === "image") {
          imageInsertions.push({ hint: field.detect_hint, storagePath: value, fieldType: field.field_type, field });
        } else {
          textReplacements.push({ hint: field.detect_hint, value });
        }
      });
    }

    // 3. Download original .docx
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("document-templates").download(doc.storage_path);

    if (dlErr || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download original file" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Unzip the .docx
    const arrayBuffer = await fileData.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 5. Download all images and add to ZIP
    let imageCounter = 1;
    const imageRels: Array<{ hint: string; rId: string; cx: number; cy: number; name: string }> = [];

    for (const img of imageInsertions) {
      try {
        const { data: imgData, error: imgErr } = await supabaseAdmin.storage
          .from("student-uploads").download(img.storagePath);

        if (imgErr || !imgData) {
          console.error(`Failed to download image: ${img.storagePath}`, imgErr);
          continue;
        }

        const imgBuffer = new Uint8Array(await imgData.arrayBuffer());
        const imgType = getImageType(imgBuffer);
        const mediaName = `image_student_${imageCounter}.${imgType}`;
        const rId = `rIdStudentImg${imageCounter}`;

        // Add image to word/media/
        zip.file(`word/media/${mediaName}`, imgBuffer);

        // Determine dimensions
        const defaults = IMAGE_DEFAULTS[img.field?.select_options?.imageHint?.type || "other"] || IMAGE_DEFAULTS.other;
        const cx = defaults.w;
        const cy = defaults.h;

        imageRels.push({ hint: img.hint, rId, cx, cy, name: mediaName });

        // Add to [Content_Types].xml if needed
        let contentTypes = await zip.file("[Content_Types].xml")!.async("string");
        const extCheck = imgType === "jpeg" ? "jpeg" : imgType;
        if (!contentTypes.includes(`Extension="${extCheck}"`)) {
          const mimeType = imgType === "jpeg" ? "image/jpeg" : imgType === "png" ? "image/png" : "image/gif";
          contentTypes = contentTypes.replace(
            "</Types>",
            `<Default Extension="${extCheck}" ContentType="${mimeType}"/></Types>`
          );
          zip.file("[Content_Types].xml", contentTypes);
        }

        imageCounter++;
      } catch (e) {
        console.error(`Error processing image ${img.storagePath}:`, e);
      }
    }

    // 6. Add image relationships to word/_rels/document.xml.rels
    if (imageRels.length > 0) {
      const relsFile = "word/_rels/document.xml.rels";
      let relsContent = await zip.file(relsFile)!.async("string");

      for (const rel of imageRels) {
        const relXml = `<Relationship Id="${rel.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${rel.name}"/>`;
        relsContent = relsContent.replace("</Relationships>", `${relXml}</Relationships>`);
      }

      zip.file(relsFile, relsContent);
    }

    // 7. Process XML files: text replacements + image placeholder replacements
    const xmlFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("word/") && name.endsWith(".xml")
    );

    for (const xmlFile of xmlFiles) {
      let content = await zip.file(xmlFile)!.async("string");

      // Text replacements
      for (const { hint, value } of textReplacements) {
        if (!hint || !value) continue;
        const xmlSafeValue = value
          .replace(/&/g, "&amp;").replace(/</g, "&lt;")
          .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const escapedHint = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        content = content.replace(new RegExp(escapedHint, "g"), xmlSafeValue);
      }

      // Image placeholder replacements
      for (const rel of imageRels) {
        const escapedHint = rel.hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Replace the hint text with an inline image drawing element
        // We need to replace the entire <w:r> containing this text with an image run
        // Strategy: find the hint in <w:t> tags and replace the parent <w:r> with image XML
        const runRegex = new RegExp(
          `<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>${escapedHint}</w:t></w:r>`,
          "g"
        );
        const imageXml = buildImageXml(rel.rId, rel.cx, rel.cy, rel.name);

        if (runRegex.test(content)) {
          content = content.replace(runRegex, imageXml);
        } else {
          // Fallback: simple text replacement (hint might be split or in different structure)
          content = content.replace(new RegExp(escapedHint, "g"), "");
        }
      }

      zip.file(xmlFile, content);
    }

    // 8. Generate the new .docx
    const outputBuffer = await zip.generateAsync({ type: "uint8array" });

    // 9. Upload to generated-documents bucket
    const outputPath = `${user.id}/${documentId}/filled.docx`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("generated-documents")
      .upload(outputPath, outputBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload generated document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Create signed URL
    const { data: signedUrl, error: signErr } = await supabaseAdmin.storage
      .from("generated-documents").createSignedUrl(outputPath, 3600);

    if (signErr) {
      return new Response(JSON.stringify({ error: "Failed to create download link" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        downloadUrl: signedUrl.signedUrl,
        filename: doc.original_filename.replace(".docx", "_filled.docx"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-document error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

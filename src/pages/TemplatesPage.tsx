export default function TemplatesPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Templates</h1>
      <p className="text-muted-foreground mb-8">Save and reuse your document templates</p>
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">No templates saved yet. Complete a document to save it as a template.</p>
      </div>
    </div>
  );
}

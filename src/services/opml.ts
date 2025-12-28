/**
 * Utility to generate OPML (Outline Processor Markup Language) 2.0 files.
 */

export interface OpmlOutline {
    text: string;
    title?: string;
    type?: string;
    xmlUrl?: string;
    htmlUrl?: string;
    description?: string;
}

export interface OpmlData {
    title: string;
    outlines: OpmlOutline[];
}

/**
 * Escapes special characters for XML.
 */
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&"']/g, (m) => {
        switch (m) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case '"':
                return "&quot;";
            case "'":
                return "&apos;";
            default:
                return m;
        }
    });
}

/**
 * Generates an OPML 2.0 XML string.
 */
export function generateOpml(data: OpmlData): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<opml version="2.0">');
    lines.push("  <head>");
    lines.push(`    <title>${escapeXml(data.title)}</title>`);
    lines.push(`    <dateCreated>${new Date().toUTCString()}</dateCreated>`);
    lines.push("  </head>");
    lines.push("  <body>");

    for (const outline of data.outlines) {
        const attrs: string[] = [];
        attrs.push(`text="${escapeXml(outline.text)}"`);
        if (outline.title) attrs.push(`title="${escapeXml(outline.title)}"`);
        if (outline.type) attrs.push(`type="${escapeXml(outline.type)}"`);
        if (outline.xmlUrl) attrs.push(`xmlUrl="${escapeXml(outline.xmlUrl)}"`);
        if (outline.htmlUrl) {
            attrs.push(`htmlUrl="${escapeXml(outline.htmlUrl)}"`);
        }
        if (outline.description) {
            attrs.push(`description="${escapeXml(outline.description)}"`);
        }

        lines.push(`    <outline ${attrs.join(" ")} />`);
    }

    lines.push("  </body>");
    lines.push("</opml>");

    return lines.join("\n");
}

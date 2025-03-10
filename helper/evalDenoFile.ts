/**
 * Escapes backticks in the literal parts of a template string,
 * leaving backticks inside `${...}` expressions intact.
 *
 * @param {string} content - The template content to process.
 * @returns {string} - The processed content with backticks escaped outside expressions.
 *
 * @example
 * const str = "Hello, `${name}` and a nested: ${(() => { return `inner \`template\``; })()}";
 * console.log(escapeBackticksOutsideExpressions(str));
 */
function escapeBackticksOutsideExpressions(content: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < content.length) {
    // Find the next expression start
    const exprStart = content.indexOf("${", cursor);

    if (exprStart === -1) {
      // No more expressions: escape all backticks in the remainder.
      result += content.slice(cursor).replace(/`/g, "\\`");
      break;
    } else {
      // Escape literal part before the expression.
      result += content.slice(cursor, exprStart).replace(/`/g, "\\`");

      // Copy the expression as-is.
      let i = exprStart + 2; // after ${
      let braceCount = 1;
      while (i < content.length && braceCount > 0) {
        if (content[i] === "{") {
          braceCount++;
        } else if (content[i] === "}") {
          braceCount--;
        }
        i++;
      }

      // Append the expression unescaped.
      result += content.slice(exprStart, i);
      cursor = i;
    }
  }

  return result;
}

/**
 * Reads an HTML file and evaluates its content as a template literal,
 * injecting variables from the provided context.
 *
 * The evaluation is performed inside a new Function (which is non‑strict by default)
 * so that a with statement can be used to provide the caller's context (e.g. articles,
 * unsubscribeLink) without needing to change the HTML template.
 *
 * @param {string} filePath - The path to the HTML file.
 * @param {Record<string, any>} context - An object containing variables to inject.
 * @returns {Promise<string | null>} - The evaluated HTML content, or null if an error occurs.
 *
 * @example
 * // Given a file "newsletterEmail.html" that uses ${articles} and ${unsubscribeLink},
 * // you can call:
 * // const emailHtml = await evalDenoFile("./templates/newsletterEmail.html", { articles, unsubscribeLink });
 * // console.log(emailHtml);
 */
export default async function evalDenoFile(
  filePath: string,
  context: Record<string, any>
): Promise<string | null> {
  try {
    // Read the HTML file content as a string.
    const content = await Deno.readTextFile(filePath);

    // Selectively escape backticks in literal portions.
    const safeContent = escapeBackticksOutsideExpressions(content);

    // Create a new function that is non-strict and uses a with block
    // to inject the provided context into the template literal.
    const evalFn = new Function(
      "context",
      `
        return (function() {
          // No "use strict" here, so the with statement is allowed.
          with (context) {
            return \`${safeContent}\`;
          }
        })();
      `
    );

    // Execute the function with the given context.
    return evalFn(context);
  } catch (error) {
    console.error(`Error reading or evaluating file: ${error.message}`);
    return null;
  }
}

// Load your service account credentials from the JSON file
const serviceAccount = JSON.parse(
  Deno.readTextFileSync("./serviceAccountKey.json")
);
export default serviceAccount.project_id;

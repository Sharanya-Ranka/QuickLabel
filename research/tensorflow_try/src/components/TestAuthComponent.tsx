import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

export function EmbeddingDashboard() {
  const handleGetEmbeddings = async () => {
    try {
      // 2. Fetch the current valid session tokens managed by Amplify
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString(); 

      if (!idToken) throw new Error("No active authenticated session found.");

      // 3. Dispatch to your public Modal backend with the token in the headers
      // const response = await fetch("https://your-modal-endpoint.modal.run", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${idToken}` // Bound to request
      //   },
      //   body: JSON.stringify({ text: "Text to create embeddings for goes here" })
      // });
      

      const result = 0 // await response.json();
      console.log("Embeddings received successfully:", result);
    } catch (err) {
      console.error("Authentication or API error:", err);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Secure Text Embeddings Service</h3>
      <button onClick={handleGetEmbeddings}>Generate Embeddings</button>
    </div>
  );
}
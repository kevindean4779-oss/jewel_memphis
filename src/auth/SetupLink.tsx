// Shows the setup link as copyable text. Authenticator apps accept the
// secret key above, so no QR library is needed.
export default function SetupLink({ text }: { text: string }) {
  return (
    <details>
      <summary className="link">Show setup link</summary>
      <code style={{ wordBreak: 'break-all', display: 'block', marginTop: 8 }}>{text}</code>
    </details>
  );
}

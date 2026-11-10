export function FormMessage({
  state,
}: {
  state: { error?: string; message?: string; ok?: boolean };
}) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.message && state.ok) {
    return <p className="text-sm text-muted">{state.message}</p>;
  }
  return null;
}

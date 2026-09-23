export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}

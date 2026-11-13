// PixiJS needs the browser.
export const ssr = false;

export function load({ params }: { params: { id: string } }) {
  return { id: params.id };
}

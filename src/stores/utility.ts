const mode = import.meta.env.MODE

export function getSourcePath(p: string)
{
  return mode === 'development' ? p : `../dist/${p}`;
}

import { Fragment, isValidElement, type ReactElement, type ReactNode } from "react";

// Atributos de SVG que se escriben en camelCase; el resto de las props camelCase de React van con guion
// (strokeWidth → stroke-width, stopOpacity → stop-opacity, clipPath → clip-path).
const CAMEL_CASE_ATTRS = new Set([
  "baseFrequency",
  "clipPathUnits",
  "gradientTransform",
  "gradientUnits",
  "kernelMatrix",
  "lengthAdjust",
  "maskContentUnits",
  "maskUnits",
  "numOctaves",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "preserveAspectRatio",
  "primitiveUnits",
  "spreadMethod",
  "stdDeviation",
  "stitchTiles",
  "tableValues",
  "textLength",
  "viewBox",
]);

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function attrName(prop: string) {
  if (prop === "className") return "class";
  if (CAMEL_CASE_ATTRS.has(prop)) return prop;
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Convierte a texto un árbol JSX de SVG hecho solo de etiquetas y componentes puros (sin hooks ni contexto),
 * como los fondos dibujados. Existe porque las rutas del App Router no pueden importar react-dom/server.
 * Falla con props que no sean texto, número o booleano (por ejemplo `style` como objeto o un handler).
 */
export function svgMarkup(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(svgMarkup).join("");
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return escape(String(node));
  if (!isValidElement(node)) throw new Error("svgMarkup: nodo no soportado");

  const { type, props } = node as ReactElement<Record<string, unknown> & { children?: ReactNode }>;
  if (type === Fragment) return svgMarkup(props.children);
  if (typeof type === "function") return svgMarkup((type as (p: typeof props) => ReactNode)(props));
  if (typeof type !== "string") throw new Error("svgMarkup: tipo de elemento no soportado");

  let attrs = "";
  for (const [prop, value] of Object.entries(props)) {
    if (prop === "children" || value == null || value === false) continue;
    if (typeof value === "object" || typeof value === "function") {
      throw new Error(`svgMarkup: la prop "${prop}" de <${type}> no es texto ni número`);
    }
    attrs += ` ${attrName(prop)}="${escape(String(value))}"`;
  }
  const children = svgMarkup(props.children);
  return children ? `<${type}${attrs}>${children}</${type}>` : `<${type}${attrs}/>`;
}

/**
 * Host half of the balance bar bundle.
 *
 * The whole feature reads existing Client-side Remote namespaces
 * (`ctx.remote.account`) and renders through a Client slot, so the Host half has
 * nothing to register. It exists so the package is a loadable Loader row.
 */
export function apply() {}

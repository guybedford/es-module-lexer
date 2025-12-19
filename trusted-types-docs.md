# Suggested README Documentation for Trusted Types Support

Here's my suggested documentation to add to the README for PR #536. This section should be added under the configuration/security section of the README:

---

## Content Security Policy (CSP) - Trusted Types

ES Module Shims supports [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API), a browser security feature that helps prevent DOM-based cross-site scripting (XSS) vulnerabilities by requiring dynamic code to pass through a policy before execution.

### Why Trusted Types?

When using strict CSP policies with `require-trusted-types-for 'script'`, browsers will block any attempt to:
- Assign strings to `innerHTML` of script elements
- Use `eval()` or similar dynamic code execution
- Dynamically create and execute scripts

Since ES Module Shims performs source rewriting and dynamic script creation internally, it needs to use Trusted Types policies to function under these strict CSP restrictions.

### Configuration

To enable Trusted Types with ES Module Shims, configure your CSP header (or `<meta>` tag) to include:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types es-module-shims;
```

Or via HTML meta tag:

```html
<meta http-equiv="Content-Security-Policy"
      content="require-trusted-types-for 'script'; trusted-types es-module-shims;">
```

### CSP Directive Breakdown

| Directive | Purpose |
|-----------|---------|
| `require-trusted-types-for 'script'` | Enforces Trusted Types for all script-like sinks |
| `trusted-types es-module-shims` | Whitelists the `es-module-shims` policy name used by the library |

### How It Works

ES Module Shims automatically creates a Trusted Types policy named `es-module-shims` when the Trusted Types API is available in the browser. This policy wraps:

- **Script content creation** - Used when rewriting module source code
- **HTML assignments** - Used for internal iframe-based feature detection

If Trusted Types is not available or not enforced, the library falls back to standard string assignments without any changes to behavior.

### Example: Complete CSP Setup

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
                 script-src 'self' 'unsafe-inline' https://ga.jspm.io;
                 require-trusted-types-for 'script';
                 trusted-types es-module-shims;">

  <script async src="https://ga.jspm.io/npm:es-module-shims@2.7.0/dist/es-module-shims.js"></script>

  <script type="importmap">
  {
    "imports": {
      "lodash": "https://ga.jspm.io/npm:lodash-es@4.17.21/lodash.js"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import _ from 'lodash';
    console.log(_.VERSION);
  </script>
</body>
</html>
```

### Custom Policies

If your application uses its own Trusted Types policy (e.g., for a framework or other library), you can include multiple policy names:

```
trusted-types es-module-shims my-app-policy another-policy;
```

### Troubleshooting

**Error: "This document requires 'TrustedScript' assignment"**

This error occurs when:
1. Your CSP includes `require-trusted-types-for 'script'`
2. But `trusted-types es-module-shims` is missing from the CSP

**Solution**: Add `es-module-shims` to your `trusted-types` directive.

**Error: "Failed to execute 'createPolicy' on 'TrustedTypePolicyFactory'"**

This can occur if:
1. The policy name `es-module-shims` is not in your `trusted-types` allowlist
2. A policy with that name was already created (policies are singletons)

**Solution**: Ensure `es-module-shims` is listed in your CSP and that no other code creates a policy with the same name before the library loads.

### Browser Support

Trusted Types is currently supported in:
- Chrome 83+
- Edge 83+
- Opera 69+

For browsers without Trusted Types support, ES Module Shims automatically falls back to standard behavior with no configuration changes required.

---

## Summary

This documentation:
1. **Explains the "why"** - Users understand what Trusted Types is and why it matters
2. **Shows the "how"** - Clear, copy-paste ready configuration examples
3. **Provides context** - Directive breakdown table explains each CSP component
4. **Includes a complete example** - Real-world usage with import maps
5. **Covers troubleshooting** - Common errors and their solutions
6. **Documents browser support** - Users know what to expect across browsers

The documentation follows the existing README style with practical examples and clear explanations.

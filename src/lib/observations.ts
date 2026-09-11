import type { Observation, ObservationStatus } from "./types";

type Variant = "latest" | "mid" | "early";

interface Spec {
  id: string;
  category: string;
  name: string;
  method: string;
  checked: string;
  whyItMatters: string;
  remainsUnknown: string;
  variants: Record<
    Variant,
    {
      status: ObservationStatus;
      summary: string;
      observed: string;
      evidence: { label: string; value: string }[];
      present?: boolean;
    }
  >;
}

function interpolate(template: string, domain: string) {
  return template.replaceAll("{domain}", domain);
}

const SPECS: Spec[] = [
  {
    id: "dns",
    category: "DNS",
    name: "Authoritative DNS answers",
    method: "Unauthenticated DNS query",
    checked:
      "Whether public resolvers receive authoritative answers for {domain} on common record types used to locate the service.",
    whyItMatters:
      "DNS is the public mapping from hostname to service. Unexpected records can send traffic somewhere other than the intended system.",
    remainsUnknown:
      "This check does not establish that every subdomain is intended, or that answers are consistent on resolvers that were not queried.",
    variants: {
      latest: {
        status: "clear",
        summary: "Authoritative nameservers answered for {domain}.",
        observed:
          "Authoritative nameservers answered for {domain}. An A record was present. No unexpected wildcard catch-all was observed by this checkset.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "NS set", value: "ns1.{domain}, ns2.{domain}" },
          { label: "A record", value: "203.0.113.40" },
          { label: "TTL", value: "300" },
        ],
      },
      mid: {
        status: "clear",
        summary: "Authoritative nameservers answered for {domain}.",
        observed:
          "Authoritative nameservers answered for {domain}. An A record was present.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "A record", value: "203.0.113.40" },
        ],
      },
      early: {
        status: "clear",
        summary: "Authoritative nameservers answered for {domain}.",
        observed:
          "Authoritative nameservers answered for {domain}. An A record was present.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "A record", value: "203.0.113.40" },
        ],
      },
    },
  },
  {
    id: "tls",
    category: "TLS",
    name: "Publicly trusted TLS certificate",
    method: "TLS handshake observation",
    checked:
      "Whether the hostname presents a valid publicly trusted TLS certificate during an unauthenticated handshake.",
    whyItMatters:
      "A trusted certificate is what browsers and clients use to decide whether the public service is the one named in the hostname. It is not a statement about application security.",
    remainsUnknown:
      "This observation does not establish the security of the application behind the hostname, nor whether private keys are well controlled.",
    variants: {
      latest: {
        status: "clear",
        summary: "A valid certificate was presented for {domain}.",
        observed:
          "A valid publicly trusted certificate was presented for {domain} during the TLS handshake. The name on the certificate matched the observed hostname.",
        evidence: [
          { label: "Observed hostname", value: "{domain}" },
          { label: "Certificate subject", value: "CN={domain}" },
          { label: "Issuer", value: "Let's Encrypt" },
          { label: "Validity period", value: "8 Aug 2026 – 6 Nov 2026" },
          { label: "Protocol", value: "TLS 1.3" },
        ],
      },
      mid: {
        status: "clear",
        summary: "A valid certificate was presented for {domain}.",
        observed:
          "A valid publicly trusted certificate was presented for {domain}.",
        evidence: [
          { label: "Observed hostname", value: "{domain}" },
          { label: "Issuer", value: "Let's Encrypt" },
          { label: "Validity period", value: "8 Aug 2026 – 6 Nov 2026" },
        ],
      },
      early: {
        status: "clear",
        summary: "A valid certificate was presented for {domain}.",
        observed:
          "A valid publicly trusted certificate was presented for {domain}.",
        evidence: [
          { label: "Observed hostname", value: "{domain}" },
          { label: "Issuer", value: "Let's Encrypt" },
        ],
      },
    },
  },
  {
    id: "headers",
    category: "HTTP security headers",
    name: "Apex HTTP security headers",
    method: "Unauthenticated HTTPS GET of the apex response",
    checked:
      "Which commonly used HTTP security headers are present on the apex HTTPS response for {domain}.",
    whyItMatters:
      "Headers such as Strict-Transport-Security are a public signal of how the site asks browsers to treat future connections. Their absence is observable without logging in.",
    remainsUnknown:
      "Missing headers are not proof of a compromise, and present headers are not proof that the application is protected. Only the apex response was observed.",
    variants: {
      latest: {
        status: "needs_attention",
        summary: "HSTS and Content-Security-Policy were not present on the apex response.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security. Content-Security-Policy was also absent. X-Content-Type-Options: nosniff was present.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
          { label: "Strict-Transport-Security", value: "Not present" },
          { label: "Content-Security-Policy", value: "Not present" },
          { label: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      mid: {
        status: "needs_attention",
        summary: "HSTS was not present on the apex response.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security or Content-Security-Policy.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Strict-Transport-Security", value: "Not present" },
          { label: "Content-Security-Policy", value: "Not present" },
        ],
      },
      early: {
        status: "needs_attention",
        summary: "HSTS was not present on the apex response.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Strict-Transport-Security", value: "Not present" },
        ],
      },
    },
  },
  {
    id: "email",
    category: "Email authentication",
    name: "SPF and DMARC publication",
    method: "DNS TXT lookup for SPF and DMARC",
    checked:
      "Whether {domain} publishes SPF and DMARC records, and what policy those records declare.",
    whyItMatters:
      "Published email authentication records are a public control against messages that claim to come from the domain. A policy of p=none monitors and does not instruct receivers to reject unauthenticated mail.",
    remainsUnknown:
      "Publication is not proof that mail is well handled operationally. DKIM selector effectiveness and mailbox provider behaviour were not established.",
    variants: {
      latest: {
        status: "needs_attention",
        summary: "SPF is published. DMARC is present with p=none.",
        observed:
          "A SPF TXT record was published for {domain}. A DMARC record was present at _dmarc.{domain} with policy p=none. DKIM selectors were not confirmed by this checkset.",
        evidence: [
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
          { label: "DMARC", value: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}" },
          { label: "DKIM", value: "Not confirmed" },
        ],
      },
      mid: {
        status: "needs_attention",
        summary: "SPF is published. DMARC is present with p=none.",
        observed:
          "SPF was published. DMARC policy was p=none.",
        evidence: [
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
          { label: "DMARC", value: "v=DMARC1; p=none" },
        ],
      },
      early: {
        status: "needs_attention",
        summary: "SPF is published. No DMARC record was observed.",
        observed:
          "A SPF record was published for {domain}. No DMARC TXT record was observed at _dmarc.{domain}.",
        evidence: [
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
          { label: "DMARC", value: "Not present" },
        ],
      },
    },
  },
  {
    id: "services",
    category: "Exposed services",
    name: "Commonly observed public ports",
    method: "Low-impact TCP connect to a short allowlisted port set",
    checked:
      "Whether a small allowlisted set of commonly exposed ports on the public address of {domain} accepted a connection.",
    whyItMatters:
      "Unexpected public services expand what an unauthenticated party can talk to. This is a bounded observation, not a full port scan.",
    remainsUnknown:
      "Ports outside the allowlisted set were not checked. A closed port in this checkset is not a claim that the host has no other listeners.",
    variants: {
      latest: {
        status: "informational",
        summary: "HTTPS on 443 responded. No additional allowlisted ports responded.",
        observed:
          "443/tcp accepted HTTPS. 80/tcp redirected to HTTPS. No additional commonly observed ports in this checkset (22, 25, 8080, 8443) accepted a connection from the observation point.",
        evidence: [
          { label: "Address", value: "203.0.113.40" },
          { label: "80/tcp", value: "Redirected to HTTPS" },
          { label: "443/tcp", value: "HTTPS responded" },
          { label: "22, 25, 8080, 8443", value: "No response observed" },
        ],
      },
      mid: {
        status: "informational",
        summary: "HTTPS on 443 responded. No additional allowlisted ports responded.",
        observed:
          "443/tcp accepted HTTPS. Other allowlisted ports did not accept a connection.",
        evidence: [
          { label: "443/tcp", value: "HTTPS responded" },
          { label: "22, 25, 8080, 8443", value: "No response observed" },
        ],
      },
      early: {
        status: "needs_attention",
        summary: "HTTPS on 443 and a service on 8080 responded.",
        observed:
          "443/tcp accepted HTTPS. 8080/tcp also accepted a connection and returned an HTTP response. 22, 25 and 8443 did not respond.",
        evidence: [
          { label: "443/tcp", value: "HTTPS responded" },
          { label: "8080/tcp", value: "HTTP 200 from a default page" },
          { label: "22, 25, 8443", value: "No response observed" },
        ],
      },
    },
  },
  {
    id: "tech",
    category: "Public technology signals",
    name: "Publicly visible technology hints",
    method: "Inspection of public HTTP response headers and HTML references",
    checked:
      "Which technology signals are visible in public HTTP headers and HTML for {domain}, without logging in.",
    whyItMatters:
      "Public technology hints can help a reviewer understand what they are looking at. They are not, by themselves, a weakness.",
    remainsUnknown:
      "Visible libraries and CDNs do not establish versions in use on the server, nor whether those components are current or exposed to a known issue.",
    variants: {
      latest: {
        status: "informational",
        summary: "Public HTML referenced a frontend bundle and a cloud CDN.",
        observed:
          "The public HTML for {domain} referenced a minified JavaScript bundle and assets served from a cloud CDN. A server header named a common reverse proxy. This is a public signal, not a finding of weakness.",
        evidence: [
          { label: "Server header", value: "nginx" },
          { label: "HTML assets", value: "/assets/index-*.js" },
          { label: "CDN host", value: "cdn.{domain}" },
        ],
      },
      mid: {
        status: "informational",
        summary: "Public HTML referenced a frontend bundle and a cloud CDN.",
        observed:
          "Public HTML referenced a frontend bundle and a cloud CDN.",
        evidence: [
          { label: "Server header", value: "nginx" },
          { label: "CDN host", value: "cdn.{domain}" },
        ],
      },
      early: {
        present: false,
        status: "informational",
        summary: "",
        observed: "",
        evidence: [],
      },
    },
  },
  {
    id: "securitytxt",
    category: "security.txt",
    name: "Published security.txt",
    method: "HTTPS GET of /.well-known/security.txt",
    checked:
      "Whether {domain} publishes a security.txt file at the well-known path, and whether a contact is present.",
    whyItMatters:
      "A published security.txt is how the organisation asks the public to report issues. Its presence is a coordination signal, not a security control.",
    remainsUnknown:
      "A reachable file does not establish that the contact is monitored, or that reports are handled.",
    variants: {
      latest: {
        status: "clear",
        summary: "security.txt was retrieved with a contact address.",
        observed:
          "https://{domain}/.well-known/security.txt returned a file with a contact mailbox and a future Expires date.",
        evidence: [
          { label: "Path", value: "/.well-known/security.txt" },
          { label: "Status", value: "200" },
          { label: "Contact", value: "mailto:security@{domain}" },
          { label: "Expires", value: "2027-01-01T00:00:00.000Z" },
        ],
      },
      mid: {
        status: "needs_attention",
        summary: "No security.txt was retrieved at the well-known path.",
        observed:
          "GET https://{domain}/.well-known/security.txt returned 404. No security.txt was observed at /security.txt either.",
        evidence: [
          { label: "Path", value: "/.well-known/security.txt" },
          { label: "Status", value: "404" },
        ],
      },
      early: {
        present: false,
        status: "undetermined",
        summary: "",
        observed: "",
        evidence: [],
      },
    },
  },
  {
    id: "certificate",
    category: "Certificate observations",
    name: "Certificate names and validity window",
    method: "Inspection of the presented certificate and public CT log query",
    checked:
      "Which names appear on the presented certificate for {domain}, whether it is currently within its validity window, and whether a matching certificate is visible in public CT logs.",
    whyItMatters:
      "The certificate is a public statement of names the operator asked a CA to bind. Extra names, a short remaining window, or unexpected issuers are reviewable facts.",
    remainsUnknown:
      "CT visibility does not prove that every issued certificate is still in use, and this check does not establish private-key hygiene.",
    variants: {
      latest: {
        status: "clear",
        summary: "Certificate covers {domain} and www.{domain}, within its validity window.",
        observed:
          "The presented certificate includes {domain} and www.{domain}. It is within its validity window. A matching leaf was visible in public CT logs.",
        evidence: [
          { label: "SAN", value: "{domain}, www.{domain}" },
          { label: "Not before", value: "8 Aug 2026" },
          { label: "Not after", value: "6 Nov 2026" },
          { label: "CT log", value: "Matching leaf observed" },
        ],
      },
      mid: {
        status: "clear",
        summary: "Certificate covers {domain} and www.{domain}, within its validity window.",
        observed:
          "The presented certificate includes {domain} and www.{domain} and is within its validity window.",
        evidence: [
          { label: "SAN", value: "{domain}, www.{domain}" },
          { label: "Not after", value: "6 Nov 2026" },
        ],
      },
      early: {
        status: "clear",
        summary: "Certificate covers {domain}, within its validity window.",
        observed:
          "The presented certificate includes {domain} and is within its validity window.",
        evidence: [
          { label: "SAN", value: "{domain}" },
          { label: "Not after", value: "6 Nov 2026" },
        ],
      },
    },
  },
  {
    id: "domain",
    category: "Domain configuration",
    name: "CAA and apex delegation",
    method: "DNS lookup for CAA and NS at the apex",
    checked:
      "Whether {domain} publishes CAA, and whether the apex NS set looks like an ordinary delegation rather than an unexpected cut.",
    whyItMatters:
      "CAA is a public instruction to certificate authorities. Unexpected nameserver changes are a common way control of a hostname is lost.",
    remainsUnknown:
      "A published CAA record does not prevent every mis-issuance, and this check does not watch registrar lock or account recovery.",
    variants: {
      latest: {
        status: "clear",
        summary: "CAA is published. Apex NS set matches the expected pair.",
        observed:
          "A CAA record was published permitting letsencrypt.org. The apex NS set matched ns1.{domain} and ns2.{domain}. No unexpected additional NS was observed.",
        evidence: [
          { label: "CAA", value: '0 issue "letsencrypt.org"' },
          { label: "NS", value: "ns1.{domain}, ns2.{domain}" },
        ],
      },
      mid: {
        status: "clear",
        summary: "CAA is published. Apex NS set matches the expected pair.",
        observed:
          "CAA permitted letsencrypt.org. Apex NS matched the expected pair.",
        evidence: [
          { label: "CAA", value: '0 issue "letsencrypt.org"' },
          { label: "NS", value: "ns1.{domain}, ns2.{domain}" },
        ],
      },
      early: {
        present: false,
        status: "undetermined",
        summary: "",
        observed: "",
        evidence: [],
      },
    },
  },
  {
    id: "exposure",
    category: "Publicly observable exposure",
    name: "Common administrative paths",
    method: "Unauthenticated GET of a short list of commonly guessed paths",
    checked:
      "Whether a short list of commonly guessed administrative paths on {domain} returned an obvious unauthenticated application surface.",
    whyItMatters:
      "A publicly reachable admin login is an observable exposure even when it is intended. This is a bounded probe, not content discovery.",
    remainsUnknown:
      "Paths outside the short list were not requested. A 404 here is not a claim that no administrative interface exists.",
    variants: {
      latest: {
        status: "clear",
        summary: "No commonly guessed admin path returned an application login in this checkset.",
        observed:
          "GET requests to /admin, /login and /wp-admin on {domain} did not return a 200 with an authentication form. /login returned 404. This is not a complete content discovery exercise.",
        evidence: [
          { label: "/admin", value: "404" },
          { label: "/login", value: "404" },
          { label: "/wp-admin", value: "404" },
        ],
      },
      mid: {
        status: "clear",
        summary: "No commonly guessed admin path returned an application login in this checkset.",
        observed:
          "GET requests to /admin, /login and /wp-admin did not return an authentication form.",
        evidence: [
          { label: "/admin", value: "404" },
          { label: "/login", value: "404" },
          { label: "/wp-admin", value: "404" },
        ],
      },
      early: {
        status: "needs_attention",
        summary: "/login returned a 200 with a sign-in form.",
        observed:
          "GET https://{domain}/login returned 200 and an HTML sign-in form. /admin and /wp-admin returned 404. Reachability of a login form is not proof that it is unsafe, but it is publicly observable.",
        evidence: [
          { label: "/login", value: "200 · HTML sign-in form" },
          { label: "/admin", value: "404" },
          { label: "/wp-admin", value: "404" },
        ],
      },
    },
  },
];

export const CHECK_STEPS = SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  category: spec.category,
}));

export function buildObservations(
  domain: string,
  variant: Variant,
  observedAt: string,
): Observation[] {
  const observations: Observation[] = [];
  for (const spec of SPECS) {
    const v = spec.variants[variant];
    if (v.present === false) continue;
    observations.push({
      id: spec.id,
      category: spec.category,
      name: spec.name,
      status: v.status,
      summary: interpolate(v.summary, domain),
      checked: interpolate(spec.checked, domain),
      observed: interpolate(v.observed, domain),
      evidence: v.evidence.map((item) => ({
        label: interpolate(item.label, domain),
        value: interpolate(item.value, domain),
      })),
      whyItMatters: interpolate(spec.whyItMatters, domain),
      remainsUnknown: interpolate(spec.remainsUnknown, domain),
      method: spec.method,
      observedAt,
    });
  }
  return observations;
}

export function observationsForDomain(domain: string, observedAt: string) {
  const host = domain.toLowerCase();
  if (host === "jonesmfg.com") {
    return buildObservations(host, "latest", observedAt).map((obs) => {
      if (obs.id === "headers" || obs.id === "email") {
        return {
          ...obs,
          status: "clear" as const,
          summary:
            obs.id === "headers"
              ? "HSTS and a restrictive CSP were present on the apex response."
              : "SPF is published. DMARC policy is p=quarantine.",
          observed:
            obs.id === "headers"
              ? `The apex HTTPS response for ${host} included Strict-Transport-Security and Content-Security-Policy.`
              : `SPF and DMARC were published for ${host}. DMARC policy was p=quarantine.`,
          evidence:
            obs.id === "headers"
              ? [
                  { label: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
                  { label: "Content-Security-Policy", value: "default-src 'self'" },
                ]
              : [
                  { label: "SPF", value: `v=spf1 include:_spf.${host} -all` },
                  { label: "DMARC", value: `v=DMARC1; p=quarantine` },
                ],
        };
      }
      return obs;
    });
  }
  if (host === "mymsp.io") {
    return buildObservations(host, "latest", observedAt).map((obs) => {
      if (obs.id === "email") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "SPF is published. DMARC policy is p=reject.",
          observed: `SPF and DMARC were published for ${host}. DMARC policy was p=reject.`,
          evidence: [
            { label: "SPF", value: `v=spf1 include:_spf.${host} -all` },
            { label: "DMARC", value: "v=DMARC1; p=reject" },
          ],
        };
      }
      return obs;
    });
  }
  return buildObservations(host, "latest", observedAt);
}

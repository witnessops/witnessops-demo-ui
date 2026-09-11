import { CHECK_CATALOG, PUBLIC_CHECK_IDS } from "./checks";
import { portCheckId, portDef } from "./ports";
import { formatDateTime } from "./format";
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
    category: "Domain & DNS",
    name: "DNS configuration",
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
    category: "Web presence",
    name: "TLS & certificates",
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
    category: "Web presence",
    name: "HTTP security headers",
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
    id: "spf",
    category: "Email",
    name: "SPF",
    method: "DNS TXT lookup for SPF",
    checked: "Whether {domain} publishes an SPF record, and what it declares.",
    whyItMatters:
      "A published SPF record is a public instruction to receiving mail servers about which hosts may send mail for the domain.",
    remainsUnknown:
      "Publication is not proof that mail is well handled operationally, or that every sending path is covered.",
    variants: {
      latest: {
        status: "clear",
        summary: "SPF is published for {domain}.",
        observed:
          "A SPF TXT record was published for {domain}. The record used a soft-fail all mechanism.",
        evidence: [
          { label: "Name", value: "{domain}" },
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
        ],
      },
      mid: {
        status: "clear",
        summary: "SPF is published for {domain}.",
        observed: "A SPF TXT record was published for {domain}.",
        evidence: [
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
        ],
      },
      early: {
        status: "clear",
        summary: "SPF is published for {domain}.",
        observed: "A SPF TXT record was published for {domain}.",
        evidence: [
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
        ],
      },
    },
  },
  {
    id: "dkim",
    category: "Email",
    name: "DKIM",
    method: "DNS TXT lookup for common DKIM selectors",
    checked:
      "Whether common DKIM selector names for {domain} return a public key record.",
    whyItMatters:
      "Visible DKIM selectors are a public signal that the domain can sign mail. Their absence from common names is not proof that no selector exists.",
    remainsUnknown:
      "Only a short list of common selector names was queried. A missing common selector does not establish that mail is unsigned.",
    variants: {
      latest: {
        status: "informational",
        summary: "No common DKIM selector was confirmed for {domain}.",
        observed:
          "TXT lookups for selector names default._domainkey, s1._domainkey and google._domainkey on {domain} did not return a public key. Other selectors were not queried.",
        evidence: [
          { label: "Selectors queried", value: "default, s1, google" },
          { label: "Result", value: "No DKIM TXT observed" },
        ],
      },
      mid: {
        status: "informational",
        summary: "No common DKIM selector was confirmed for {domain}.",
        observed:
          "Common DKIM selector names did not return a public key record.",
        evidence: [
          { label: "Selectors queried", value: "default, s1, google" },
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
    id: "dmarc",
    category: "Email",
    name: "DMARC",
    method: "DNS TXT lookup for DMARC",
    checked:
      "Whether {domain} publishes a DMARC record, and what policy that record declares.",
    whyItMatters:
      "A DMARC policy is a public instruction to receivers about unauthenticated mail that claims to come from the domain. A policy of p=none monitors and does not instruct receivers to reject.",
    remainsUnknown:
      "Publication is not proof that reports are read, or that mailbox providers honour the policy.",
    variants: {
      latest: {
        status: "needs_attention",
        summary: "DMARC is present with p=none.",
        observed:
          "A DMARC record was present at _dmarc.{domain} with policy p=none. Receivers are asked to monitor, not to reject unauthenticated mail.",
        evidence: [
          { label: "Name", value: "_dmarc.{domain}" },
          { label: "DMARC", value: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}" },
        ],
      },
      mid: {
        status: "needs_attention",
        summary: "DMARC is present with p=none.",
        observed: "DMARC policy was p=none.",
        evidence: [{ label: "DMARC", value: "v=DMARC1; p=none" }],
      },
      early: {
        status: "needs_attention",
        summary: "No DMARC record was observed.",
        observed: "No DMARC TXT record was observed at _dmarc.{domain}.",
        evidence: [{ label: "DMARC", value: "Not present" }],
      },
    },
  },
  {
    id: "services",
    category: "Public exposure",
    name: "Publicly observable services",
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
    category: "Web presence",
    name: "Public technology signals",
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
        observed: "Public HTML referenced a frontend bundle and a cloud CDN.",
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
    category: "Web presence",
    name: "security.txt",
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
    category: "Domain & DNS",
    name: "Certificate transparency",
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
    category: "Domain & DNS",
    name: "Domain observations",
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
        observed: "CAA permitted letsencrypt.org. Apex NS matched the expected pair.",
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
    category: "Public exposure",
    name: "Common exposed interfaces",
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
  {
    id: "http",
    category: "Web presence",
    name: "HTTP response",
    method: "Unauthenticated HTTPS GET of the public response",
    checked:
      "Whether {domain} returns a public HTTP or HTTPS response without authentication.",
    whyItMatters:
      "A public response is the baseline that later header, TLS and content observations refer to. It is not a statement about application security.",
    remainsUnknown:
      "A successful response does not establish that every path behaves the same way, or that the origin is the intended system behind a CDN.",
    variants: {
      latest: {
        status: "clear",
        summary: "HTTPS on {domain} returned a public 200 response.",
        observed:
          "GET https://{domain}/ returned HTTP 200. HTTP on port 80 redirected to HTTPS.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
          { label: "HTTP", value: "Redirected to HTTPS" },
        ],
      },
      mid: {
        status: "clear",
        summary: "HTTPS on {domain} returned a public 200 response.",
        observed: "GET https://{domain}/ returned HTTP 200.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
        ],
      },
      early: {
        status: "clear",
        summary: "HTTPS on {domain} returned a public 200 response.",
        observed: "GET https://{domain}/ returned HTTP 200.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
        ],
      },
    },
  },
  {
    id: "mx",
    category: "Email",
    name: "MX",
    method: "Unauthenticated DNS query for MX",
    checked: "Whether public DNS publishes MX records for {domain}.",
    whyItMatters:
      "MX records are the public instruction for where mail for the domain should be delivered.",
    remainsUnknown:
      "Published MX records do not establish that the mail host accepts mail for every address, or that it is the intended operator.",
    variants: {
      latest: {
        status: "clear",
        summary: "MX for {domain} points at mail.{domain}.",
        observed:
          "An MX record was published for {domain} with preference 10, pointing at mail.{domain}.",
        evidence: [
          { label: "Name", value: "{domain}" },
          { label: "MX", value: "10 mail.{domain}" },
        ],
      },
      mid: {
        status: "clear",
        summary: "MX for {domain} points at mail.{domain}.",
        observed: "An MX record was published for {domain}.",
        evidence: [{ label: "MX", value: "10 mail.{domain}" }],
      },
      early: {
        status: "clear",
        summary: "MX for {domain} points at mail.{domain}.",
        observed: "An MX record was published for {domain}.",
        evidence: [{ label: "MX", value: "10 mail.{domain}" }],
      },
    },
  },
  {
    id: "mailhost",
    category: "Email",
    name: "Mail host exposure",
    method: "Bounded TCP connection attempt to the published mail host",
    checked:
      "Whether the published mail host for {domain} responded on a common mail port from the observation point.",
    whyItMatters:
      "A reachable mail service is an expected public surface for a mail hostname. Reachability is not a finding of weakness.",
    remainsUnknown:
      "This does not establish mail server configuration, authentication quality, or whether the host accepts mail for the domain.",
    variants: {
      latest: {
        status: "informational",
        summary: "The published mail host responded on 25/tcp.",
        observed:
          "mail.{domain} accepted a TCP connection on port 25 and returned a short SMTP banner. This is a public reachability observation, not a test of mail security.",
        evidence: [
          { label: "Target", value: "mail.{domain}" },
          { label: "Port", value: "25" },
          { label: "Protocol", value: "TCP" },
          { label: "Banner", value: "220 mail.{domain} ESMTP" },
        ],
      },
      mid: {
        status: "informational",
        summary: "The published mail host responded on 25/tcp.",
        observed: "mail.{domain} accepted a TCP connection on port 25.",
        evidence: [
          { label: "Target", value: "mail.{domain}" },
          { label: "Port", value: "25" },
        ],
      },
      early: {
        status: "informational",
        summary: "The published mail host responded on 25/tcp.",
        observed: "mail.{domain} accepted a TCP connection on port 25.",
        evidence: [
          { label: "Target", value: "mail.{domain}" },
          { label: "Port", value: "25" },
        ],
      },
    },
  },
  {
    id: "banner",
    category: "Public exposure",
    name: "Public banners",
    method: "Read of a short identifying banner from an observed service",
    checked:
      "Whether an observed service on {domain} returned a short identifying banner during a bounded connection.",
    whyItMatters:
      "A public banner is a hint about the software presenting the service. It is not, by itself, a vulnerability.",
    remainsUnknown:
      "A banner does not establish the true software version, patch level, or whether the service is authorized.",
    variants: {
      latest: {
        status: "informational",
        summary: "An observed service returned a short identifying banner.",
        observed:
          "A bounded connection to an observed service on {domain} returned a short banner naming a common server product. This is a public signal, not a finding of weakness.",
        evidence: [
          { label: "Target", value: "{domain}" },
          { label: "Banner", value: "nginx" },
        ],
      },
      mid: {
        status: "informational",
        summary: "An observed service returned a short identifying banner.",
        observed: "A bounded connection returned a short server banner.",
        evidence: [{ label: "Banner", value: "nginx" }],
      },
      early: {
        status: "informational",
        summary: "An observed service returned a short identifying banner.",
        observed: "A bounded connection returned a short server banner.",
        evidence: [{ label: "Banner", value: "nginx" }],
      },
    },
  },
];

export function buildObservations(
  domain: string,
  variant: Variant,
  observedAt: string,
  checkIds?: string[],
): Observation[] {
  const allowed = checkIds ? new Set(checkIds) : null;
  const observations: Observation[] = [];
  for (const spec of SPECS) {
    if (allowed && !allowed.has(spec.id)) continue;
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

function applyDomainOverrides(domain: string, observations: Observation[]) {
  const host = domain.toLowerCase();
  if (host === "jonesmfg.com") {
    return observations.map((obs) => {
      if (obs.id === "headers") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "HSTS and a restrictive CSP were present on the apex response.",
          observed: `The apex HTTPS response for ${host} included Strict-Transport-Security and Content-Security-Policy.`,
          evidence: [
            {
              label: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
            { label: "Content-Security-Policy", value: "default-src 'self'" },
          ],
        };
      }
      if (obs.id === "dmarc") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "DMARC policy is p=quarantine.",
          observed: `DMARC was published for ${host}. Policy was p=quarantine.`,
          evidence: [{ label: "DMARC", value: "v=DMARC1; p=quarantine" }],
        };
      }
      if (obs.id === "spf") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "SPF is published with a hard-fail all mechanism.",
          observed: `SPF was published for ${host}.`,
          evidence: [{ label: "SPF", value: `v=spf1 include:_spf.${host} -all` }],
        };
      }
      return obs;
    });
  }
  if (host === "mymsp.io") {
    return observations.map((obs) => {
      if (obs.id === "dmarc") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "DMARC policy is p=reject.",
          observed: `DMARC was published for ${host}. Policy was p=reject.`,
          evidence: [{ label: "DMARC", value: "v=DMARC1; p=reject" }],
        };
      }
      if (obs.id === "spf") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "SPF is published with a hard-fail all mechanism.",
          observed: `SPF was published for ${host}.`,
          evidence: [{ label: "SPF", value: `v=spf1 include:_spf.${host} -all` }],
        };
      }
      return obs;
    });
  }
  if (host === "203.0.113.24") {
    return observations.map((obs) => {
      if (obs.id === "tls") {
        return {
          ...obs,
          status: "clear" as const,
          summary: "A valid certificate was presented for this address.",
          observed:
            "A valid publicly trusted certificate was presented during the TLS handshake on port 443. The certificate name did not match a hostname on this address.",
          evidence: [
            { label: "Observed address", value: host },
            { label: "Certificate subject", value: "CN=api.acme.com" },
            { label: "Issuer", value: "Let's Encrypt" },
            { label: "Protocol", value: "TLS 1.3" },
          ],
        };
      }
      if (obs.id === "headers") {
        return {
          ...obs,
          status: "informational" as const,
          summary: "HTTPS on this address returned a public response without HSTS.",
          observed: `GET https://${host}/ returned 200. Strict-Transport-Security was not present.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "200" },
            { label: "Strict-Transport-Security", value: "Not present" },
          ],
        };
      }
      if (obs.id === "banner") {
        return {
          ...obs,
          status: "informational" as const,
          summary: "SSH on port 22 returned a short identifying banner.",
          observed:
            "A bounded connection to port 22 returned SSH-2.0-OpenSSH. A banner is a public signal, not a finding of weakness.",
          evidence: [
            { label: "Target", value: host },
            { label: "Port", value: "22" },
            { label: "Banner", value: "SSH-2.0-OpenSSH" },
          ],
        };
      }
      return obs;
    });
  }
  if (host === "api.acme.com") {
    return observations.map((obs) => {
      if (obs.id === "headers") {
        return {
          ...obs,
          status: "needs_attention" as const,
          summary: "HSTS was not present on the API HTTPS response.",
          observed: `The HTTPS response for ${host} did not include Strict-Transport-Security. Content-Security-Policy was also absent.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "200" },
            { label: "Strict-Transport-Security", value: "Not present" },
            { label: "Content-Security-Policy", value: "Not present" },
          ],
        };
      }
      if (obs.id === "tech") {
        return {
          ...obs,
          status: "informational" as const,
          summary: "Public responses named an API gateway and a JSON content type.",
          observed: `Responses from ${host} included a gateway header and application/json. This is a public signal, not a finding of weakness.`,
          evidence: [
            { label: "Content-Type", value: "application/json" },
            { label: "Server header", value: "cloudflare" },
          ],
        };
      }
      if (obs.id === "securitytxt") {
        return {
          ...obs,
          status: "needs_attention" as const,
          summary: "No security.txt was retrieved at the well-known path.",
          observed: `GET https://${host}/.well-known/security.txt returned 404.`,
          evidence: [
            { label: "Path", value: "/.well-known/security.txt" },
            { label: "Status", value: "404" },
          ],
        };
      }
      if (obs.id === "http") {
        return {
          ...obs,
          status: "clear" as const,
          summary: `HTTPS on ${host} returned a public 200 response.`,
          observed: `GET https://${host}/health returned HTTP 200.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/health` },
            { label: "Status", value: "200" },
          ],
        };
      }
      return obs;
    });
  }
  if (host === "mail.acme.com" || host === "acme.com") {
    return observations.map((obs) => {
      if (host === "mail.acme.com" && obs.id === "headers") {
        return {
          ...obs,
          status: "informational" as const,
          summary: "The mail hostname did not return a web application on HTTPS.",
          observed: `HTTPS on ${host} returned 404. This hostname appears to be used for mail, not a public website.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "404" },
          ],
        };
      }
      return obs;
    });
  }
  return observations;
}

function defaultPortState(
  target: string,
  port: number,
  variant: Variant,
): { observed: boolean; attention: boolean; banner?: string } {
  const host = target.toLowerCase();
  if (host === "203.0.113.24") {
    if (port === 22) return { observed: true, attention: true, banner: "SSH-2.0-OpenSSH" };
    if (port === 80) return { observed: true, attention: false };
    if (port === 443) return { observed: true, attention: false };
    return { observed: false, attention: false };
  }
  if (host.startsWith("mail.")) {
    if (port === 25) return { observed: true, attention: false, banner: `220 ${host} ESMTP` };
    if (port === 443) return { observed: true, attention: false };
    return { observed: false, attention: false };
  }
  if (variant === "early" && port === 8080) {
    return { observed: true, attention: true };
  }
  if (port === 80 || port === 443) return { observed: true, attention: false };
  return { observed: false, attention: false };
}

export function buildPortObservations(
  target: string,
  ports: number[],
  observedAt: string,
  variant: Variant = "latest",
): Observation[] {
  return ports.map((port) => {
    const def = portDef(port);
    const state = defaultPortState(target, port, variant);
    const observed = state.observed;
    const status: ObservationStatus = state.attention
      ? "needs_attention"
      : observed
        ? "informational"
        : "clear";
    const serviceHint = def.name !== `Port ${port}` ? ` (${def.name})` : "";
    return {
      id: portCheckId(port),
      category: "Public services",
      name: `${port}/tcp`,
      status,
      statusLabel: state.attention ? undefined : observed ? "Observed" : "Not observed",
      summary: observed
        ? `A TCP service responded on port ${port}${serviceHint}.`
        : `No TCP service responded on port ${port} from the observation point.`,
      checked: `Whether TCP port ${port} responded to a bounded connection attempt.`,
      observed: observed
        ? `A TCP service responded on port ${port}.`
        : `No TCP service responded on port ${port} from the observation point.`,
      evidence: [
        { label: "Target", value: target },
        { label: "Port", value: String(port) },
        { label: "Protocol", value: def.protocol },
        { label: "Service name", value: def.name },
        { label: "Result", value: observed ? "Observed" : "Not observed" },
        ...(state.banner ? [{ label: "Banner", value: state.banner }] : []),
        { label: "Observed at", value: formatDateTime(observedAt) },
      ],
      whyItMatters: observed
        ? `${def.name} is publicly reachable from the observation point. Reachability is evidence of a public service, not a vulnerability.`
        : "A port that did not respond in this bounded set is not a claim that the host has no other listeners.",
      remainsUnknown:
        "This does not establish whether authentication is weak, the service is vulnerable, or access is unauthorized.",
      method: "TCP connection attempt",
      observedAt,
    };
  });
}

export function observationsForRun(input: {
  target: string;
  observedAt: string;
  checkIds: string[];
  ports?: number[];
  variant?: Variant;
}) {
  const variant = input.variant ?? "latest";
  const checkIds = input.checkIds.filter((id) => !id.startsWith("port-"));
  const checks = applyDomainOverrides(
    input.target,
    buildObservations(input.target.toLowerCase(), variant, input.observedAt, checkIds),
  );
  const catalogOrder = new Map(CHECK_CATALOG.map((check, index) => [check.id, index]));
  checks.sort((a, b) => {
    const ai = catalogOrder.get(a.id) ?? 99;
    const bi = catalogOrder.get(b.id) ?? 99;
    return ai - bi;
  });
  const ports = buildPortObservations(
    input.target,
    input.ports ?? [],
    input.observedAt,
    variant,
  );
  return [...checks, ...ports];
}

export function observationsForDomain(
  domain: string,
  observedAt: string,
  checkIds: string[] = PUBLIC_CHECK_IDS,
) {
  return observationsForRun({
    target: domain,
    observedAt,
    checkIds,
  });
}

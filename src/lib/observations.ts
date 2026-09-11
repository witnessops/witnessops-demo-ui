import { CHECK_CATALOG, PUBLIC_CHECK_IDS, checkById, contractStatusFromUi } from "./checks";
import { MOCK_CHECK_VERSION } from "./contracts";
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
      recommendation?: string | null;
    }
  >;
}

function interpolate(template: string, domain: string) {
  return template.replaceAll("{domain}", domain);
}

function sourceRefs(id: string) {
  const check = checkById(id);
  if (check?.implementation === "REAL_NOW") {
    return [
      `external-exposure-snapshot.json: checks[check_id=${id}]`,
      "The source appendix records the bounded observation and connection/query ledger.",
    ];
  }
  return ["prototype-mock-observation"];
}

function attachSource(
  observation: Observation,
  extras?: { recommendation?: string | null },
): Observation {
  const check = checkById(observation.id);
  const collected = observation.collected ?? true;
  const contractStatus =
    observation.contractStatus ??
    contractStatusFromUi(observation.status, collected);
  return {
    ...observation,
    checkId: observation.checkId ?? observation.id,
    checkVersion: observation.checkVersion ?? check?.checkVersion ?? MOCK_CHECK_VERSION,
    contractStatus,
    collected,
    interpretation: observation.interpretation ?? observation.observed,
    limitations: observation.limitations ?? [observation.remainsUnknown],
    recommendation:
      extras?.recommendation !== undefined
        ? extras.recommendation
        : (observation.recommendation ?? null),
    sourceEvidenceRefs: observation.sourceEvidenceRefs ?? sourceRefs(observation.id),
    implementation: check?.implementation ?? observation.implementation,
    startedAt: observation.startedAt ?? observation.observedAt,
    finishedAt: observation.finishedAt ?? observation.observedAt,
  };
}

const SPECS: Spec[] = [
  {
    id: "dns.public_target.v1",
    category: "Domain & DNS",
    name: "Public DNS target",
    method:
      "Controlled A and AAAA resolution; reject every non-global candidate before application traffic.",
    checked:
      "Whether public resolvers return connection-eligible addresses for {domain}.",
    whyItMatters:
      "Public resolution is an eligibility observation. It is the mapping from hostname to a public address, not a security conclusion.",
    remainsUnknown:
      "This check does not establish that every subdomain is intended, or that answers are consistent on resolvers that were not queried.",
    variants: {
      latest: {
        status: "clear",
        summary: "Only public connection-eligible addresses were returned.",
        observed:
          "Public resolvers returned connection-eligible addresses for {domain}. An A record was present. No outbound application connection is implied by this observation alone.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "A record", value: "203.0.113.40" },
          { label: "AAAA", value: "None" },
          { label: "TTL", value: "300" },
        ],
      },
      mid: {
        status: "clear",
        summary: "Only public connection-eligible addresses were returned.",
        observed:
          "Public resolvers returned a public A record for {domain}.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "A record", value: "203.0.113.40" },
        ],
      },
      early: {
        status: "clear",
        summary: "Only public connection-eligible addresses were returned.",
        observed:
          "Public resolvers returned a public A record for {domain}.",
        evidence: [
          { label: "Queried name", value: "{domain}" },
          { label: "A record", value: "203.0.113.40" },
        ],
      },
    },
  },
  {
    id: "tls.certificate.v1",
    category: "Web presence",
    name: "TLS certificate state",
    method:
      "One TLS handshake to a validated address on 443, with logical hostname SNI and certificate hostname validation.",
    checked:
      "Whether the hostname presents a trusted certificate that matches {domain} and remains valid for more than 30 days.",
    whyItMatters:
      "A trusted matching certificate is what clients use to decide whether the public service is the one named in the hostname. It is not a statement about application security.",
    remainsUnknown:
      "One TLS handshake and the local trust store were used; revocation, all endpoints and all cipher suites were not assessed.",
    variants: {
      latest: {
        status: "clear",
        summary: "The observed certificate was trusted, matched the hostname and remains valid for more than 30 days.",
        observed:
          "A trusted publicly issued certificate was presented for {domain}. The name matched the hostname and the certificate remains valid for more than 30 days.",
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
        summary: "The observed certificate was trusted and matched the hostname.",
        observed:
          "A trusted certificate was presented for {domain} and remains valid for more than 30 days.",
        evidence: [
          { label: "Observed hostname", value: "{domain}" },
          { label: "Issuer", value: "Let's Encrypt" },
          { label: "Validity period", value: "8 Aug 2026 – 6 Nov 2026" },
        ],
      },
      early: {
        status: "clear",
        summary: "The observed certificate was trusted and matched the hostname.",
        observed:
          "A trusted certificate was presented for {domain}.",
        evidence: [
          { label: "Observed hostname", value: "{domain}" },
          { label: "Issuer", value: "Let's Encrypt" },
        ],
      },
    },
  },
  {
    id: "tls.legacy_protocols.v1",
    category: "Web presence",
    name: "Legacy TLS protocols",
    method:
      "At most one TLS 1.0 and one TLS 1.1 attempt, without cipher enumeration.",
    checked:
      "Whether {domain} still negotiates TLS 1.0 or TLS 1.1 from this observation point.",
    whyItMatters:
      "Legacy TLS protocols are a public transport observation. Negotiation is not a complete cipher audit.",
    remainsUnknown:
      "Only TLS 1.0 and TLS 1.1 were probed; a local protocol or cipher restriction is not evidence that the peer rejects a protocol.",
    variants: {
      latest: {
        status: "clear",
        summary: "The peer explicitly rejected both tested legacy TLS protocols.",
        observed:
          "TLS 1.0 and TLS 1.1 attempts to {domain} were rejected by the peer. No legacy protocol was negotiated.",
        evidence: [
          { label: "TLSv1", value: "peer_rejected" },
          { label: "TLSv1.1", value: "peer_rejected" },
        ],
      },
      mid: {
        status: "clear",
        summary: "The peer explicitly rejected both tested legacy TLS protocols.",
        observed: "TLS 1.0 and TLS 1.1 were rejected by the peer.",
        evidence: [
          { label: "TLSv1", value: "peer_rejected" },
          { label: "TLSv1.1", value: "peer_rejected" },
        ],
      },
      early: {
        status: "undetermined",
        summary: "The probes did not establish explicit peer rejection of both legacy protocols.",
        observed:
          "A TLS 1.0 attempt ended without an explicit peer rejection. No security conclusion follows.",
        evidence: [
          { label: "TLSv1", value: "undetermined" },
          { label: "TLSv1.1", value: "peer_rejected" },
        ],
      },
    },
  },
  {
    id: "web.https_redirect.v1",
    category: "Web presence",
    name: "HTTP to HTTPS transition",
    method:
      "GET the HTTP root and follow at most three HTTP/HTTPS redirects, validating each new connection.",
    checked:
      "Whether the HTTP root request for {domain} transitions to a usable HTTPS response.",
    whyItMatters:
      "The root HTTP to HTTPS transition is a public signal of how the hostname asks clients to continue. It is not a claim about every route.",
    remainsUnknown:
      "Only the root request and this bounded redirect chain were tested. This does not establish redirect behavior for every route.",
    variants: {
      latest: {
        status: "clear",
        summary: "The HTTP root request transitioned to a usable HTTPS response.",
        observed:
          "GET http://{domain}/ returned 301 to https://{domain}/, which returned 200.",
        evidence: [
          { label: "HTTP request", value: "GET http://{domain}/" },
          { label: "HTTP status", value: "301" },
          { label: "HTTPS request", value: "GET https://{domain}/" },
          { label: "HTTPS status", value: "200" },
        ],
      },
      mid: {
        status: "clear",
        summary: "The HTTP root request transitioned to a usable HTTPS response.",
        observed: "The HTTP root redirected to a usable HTTPS response.",
        evidence: [
          { label: "HTTP status", value: "301" },
          { label: "HTTPS status", value: "200" },
        ],
      },
      early: {
        status: "clear",
        summary: "The HTTP root request transitioned to a usable HTTPS response.",
        observed: "The HTTP root redirected to HTTPS.",
        evidence: [{ label: "HTTPS status", value: "200" }],
      },
    },
  },
  {
    id: "web.hsts.v1",
    category: "Web presence",
    name: "HTTP Strict Transport Security",
    method:
      "Parse Strict-Transport-Security from the shared final usable HTTPS response.",
    checked:
      "Whether the HTTPS response for {domain} includes HSTS with a positive max-age.",
    whyItMatters:
      "HSTS is a public instruction to browsers about future connections. Its absence is observable without logging in.",
    remainsUnknown:
      "This checks the observed HTTPS response only; preload membership and subdomain coverage were not tested.",
    variants: {
      latest: {
        status: "needs_attention",
        summary: "The response did not include HSTS.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
          { label: "Strict-Transport-Security", value: "Not present" },
        ],
        recommendation:
          "Consider a suitable Strict-Transport-Security policy after validating HTTPS coverage.",
      },
      mid: {
        status: "needs_attention",
        summary: "The response did not include HSTS.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Strict-Transport-Security", value: "Not present" },
        ],
        recommendation:
          "Consider a suitable Strict-Transport-Security policy after validating HTTPS coverage.",
      },
      early: {
        status: "needs_attention",
        summary: "The response did not include HSTS.",
        observed:
          "The apex HTTPS response for {domain} did not include Strict-Transport-Security.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Strict-Transport-Security", value: "Not present" },
        ],
        recommendation:
          "Consider a suitable Strict-Transport-Security policy after validating HTTPS coverage.",
      },
    },
  },
  {
    id: "web.security_headers.v1",
    category: "Web presence",
    name: "Browser security headers",
    method:
      "Inspect nosniff, framing protection, CSP and Referrer-Policy on the shared HTTPS response.",
    checked:
      "Which nosniff, framing, CSP and Referrer-Policy headers appear on the HTTPS response for {domain}.",
    whyItMatters:
      "These headers are a public signal of how the site asks browsers to treat the response. Presence is not policy effectiveness.",
    remainsUnknown:
      "This checks header presence and bounded syntax, not policy effectiveness. CSP completeness and application security were not assessed.",
    variants: {
      latest: {
        status: "needs_attention",
        summary: "The response lacks recognized nosniff or frame-policy headers.",
        observed:
          "The apex HTTPS response for {domain} included X-Content-Type-Options: nosniff. No recognized X-Frame-Options or CSP frame-ancestors declaration was present. Content-Security-Policy and Referrer-Policy were also absent.",
        evidence: [
          { label: "Request", value: "GET https://{domain}/" },
          { label: "Status", value: "200" },
          { label: "X-Content-Type-Options", value: "nosniff" },
          { label: "X-Frame-Options", value: "Not present" },
          { label: "Content-Security-Policy", value: "Not present" },
          { label: "Referrer-Policy", value: "Not present" },
        ],
        recommendation:
          "Review X-Content-Type-Options and an appropriate frame-ancestors or X-Frame-Options policy.",
      },
      mid: {
        status: "needs_attention",
        summary: "The response lacks a recognized frame-policy header.",
        observed:
          "Nosniff was present. No recognized framing policy, CSP or Referrer-Policy was observed.",
        evidence: [
          { label: "X-Content-Type-Options", value: "nosniff" },
          { label: "X-Frame-Options", value: "Not present" },
          { label: "Content-Security-Policy", value: "Not present" },
        ],
        recommendation:
          "Review X-Content-Type-Options and an appropriate frame-ancestors or X-Frame-Options policy.",
      },
      early: {
        status: "needs_attention",
        summary: "The response lacks recognized nosniff or frame-policy headers.",
        observed: "No recognized framing policy was present on the apex HTTPS response.",
        evidence: [
          { label: "X-Frame-Options", value: "Not present" },
          { label: "Content-Security-Policy", value: "Not present" },
        ],
      },
    },
  },
  {
    id: "web.security_txt.v1",
    category: "Web presence",
    name: "Vulnerability reporting contact",
    method:
      "At most two HTTPS GETs: /.well-known/security.txt, then /security.txt if needed; 64 KiB each.",
    checked:
      "Whether {domain} publishes a security.txt file at the well-known path, and whether a contact is present.",
    whyItMatters:
      "A published security.txt is how the organisation asks the public to report issues. Its presence is a coordination signal, not a security control.",
    remainsUnknown:
      "The file is a published contact declaration; contact ownership, delivery, signatures and vulnerability handling were not authenticated.",
    variants: {
      latest: {
        status: "clear",
        summary: "The well-known file contained parseable Contact and current Expires fields.",
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
        status: "informational",
        summary: "No security.txt file was observed at this location.",
        observed:
          "GET https://{domain}/.well-known/security.txt returned 404. No security.txt was observed at /security.txt either.",
        evidence: [
          { label: "Path", value: "/.well-known/security.txt" },
          { label: "Status", value: "404" },
        ],
        recommendation: "Consider publishing security.txt at /.well-known/security.txt.",
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
    id: "mail.spf.v1",
    category: "Email",
    name: "SPF publication",
    method:
      "TXT and MX at the submitted hostname. Bounded publication syntax only; no mechanism recursion.",
    checked: "Whether {domain} publishes an SPF record, and what it declares.",
    whyItMatters:
      "A published SPF record is a public instruction to receiving mail servers about which hosts may send mail for the domain.",
    remainsUnknown:
      "Only published SPF syntax was checked. Includes, redirects, macros, DNS lookup limits and actual sender authorization were not evaluated.",
    variants: {
      latest: {
        status: "clear",
        summary: "One SPF record was parseable and no unconditional pass mechanism was observed.",
        observed:
          "A single SPF TXT record was published for {domain}. The record used a soft-fail all mechanism.",
        evidence: [
          { label: "Name", value: "{domain}" },
          { label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" },
          { label: "MX present", value: "Yes" },
        ],
      },
      mid: {
        status: "clear",
        summary: "One SPF record was parseable.",
        observed: "A SPF TXT record was published for {domain}.",
        evidence: [{ label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" }],
      },
      early: {
        status: "clear",
        summary: "One SPF record was parseable.",
        observed: "A SPF TXT record was published for {domain}.",
        evidence: [{ label: "SPF", value: "v=spf1 include:_spf.{domain} ~all" }],
      },
    },
  },
  {
    id: "mail.dmarc.v1",
    category: "Email",
    name: "DMARC publication",
    method:
      "TXT at _dmarc.hostname and the shared MX observation. No contact with reporting destinations.",
    checked:
      "Whether {domain} publishes a DMARC record, and what policy that record declares.",
    whyItMatters:
      "A DMARC policy is a public instruction to receivers about unauthenticated mail that claims to come from the domain. A policy of p=none monitors and does not instruct receivers to reject.",
    remainsUnknown:
      "Only this hostname’s published DMARC syntax was checked; organizational-domain fallback, report authorization, delivery and alignment were not evaluated.",
    variants: {
      latest: {
        status: "informational",
        summary: "DMARC requests monitoring without quarantine or rejection.",
        observed:
          "A DMARC record was present at _dmarc.{domain} with policy p=none. Receivers are asked to monitor, not to reject unauthenticated mail.",
        evidence: [
          { label: "Name", value: "_dmarc.{domain}" },
          { label: "DMARC", value: "v=DMARC1; p=none; rua=mailto:dmarc@{domain}" },
          { label: "MX present", value: "Yes" },
        ],
        recommendation: "Review reports before choosing an enforcement policy.",
      },
      mid: {
        status: "informational",
        summary: "DMARC requests monitoring without quarantine or rejection.",
        observed: "DMARC policy was p=none.",
        evidence: [{ label: "DMARC", value: "v=DMARC1; p=none" }],
        recommendation: "Review reports before choosing an enforcement policy.",
      },
      early: {
        status: "needs_attention",
        summary: "No DMARC record was observed at the queried name.",
        observed: "No DMARC TXT record was observed at _dmarc.{domain}. MX was present.",
        evidence: [
          { label: "DMARC", value: "Not present" },
          { label: "MX present", value: "Yes" },
        ],
        recommendation: "Confirm the mail policy and whether a parent-domain policy applies.",
      },
    },
  },
  {
    id: "dns.caa.v1",
    category: "Domain & DNS",
    name: "CAA publication",
    method:
      "Recursive resolver CAA lookup and parent inheritance, at most five names, bounded by the PSL registrable domain.",
    checked:
      "Whether CAA issuance restrictions are published for {domain} within the registrable-domain boundary.",
    whyItMatters:
      "CAA is a public instruction to certificate authorities. Absence of CAA does not establish that unauthorized certificates exist.",
    remainsUnknown:
      "This interprets the supplied CAA records only; CA-specific parameters, issuance history and DNSSEC were not evaluated. Inheritance stops at the PSL registrable domain.",
    variants: {
      latest: {
        status: "clear",
        summary: "CAA issuance restrictions were observed.",
        observed:
          "A CAA record was published permitting letsencrypt.org. Inheritance stopped at the registrable domain {domain}.",
        evidence: [
          { label: "Effective name", value: "{domain}" },
          { label: "CAA", value: '0 issue "letsencrypt.org"' },
        ],
      },
      mid: {
        status: "clear",
        summary: "CAA issuance restrictions were observed.",
        observed: "CAA permitted letsencrypt.org.",
        evidence: [{ label: "CAA", value: '0 issue "letsencrypt.org"' }],
      },
      early: {
        status: "informational",
        summary: "No effective CAA restriction was observed within the stated registrable-domain boundary.",
        observed: "No CAA records were returned for {domain} or its registrable-domain parents.",
        evidence: [
          { label: "Queried names", value: "{domain}" },
          { label: "Records", value: "None" },
        ],
      },
    },
  },
  {
    id: "mail.dkim.v1",
    category: "Email",
    name: "DKIM selectors",
    method: "DNS TXT lookup of a short list of common DKIM selectors",
    checked:
      "Whether a short list of common DKIM selector names is visible in public DNS for {domain}.",
    whyItMatters:
      "A published DKIM selector is a public signal that the domain has configured mail signing. Missing common selectors are not proof that mail is unsigned.",
    remainsUnknown:
      "Only a short list of common selector names was queried. A missing common selector does not establish that mail is unsigned.",
    variants: {
      latest: {
        status: "informational",
        summary: "A common DKIM selector answered in public DNS.",
        observed:
          "selector1._domainkey.{domain} returned a TXT record. Other common selectors in this short list did not.",
        evidence: [
          { label: "selector1._domainkey.{domain}", value: "TXT present" },
          { label: "google._domainkey.{domain}", value: "NXDOMAIN" },
        ],
      },
      mid: {
        status: "informational",
        summary: "A common DKIM selector answered in public DNS.",
        observed: "selector1._domainkey.{domain} returned a TXT record.",
        evidence: [{ label: "selector1._domainkey.{domain}", value: "TXT present" }],
      },
      early: {
        status: "informational",
        summary: "No common DKIM selector in this short list answered.",
        observed: "The short list of common DKIM selectors did not return TXT records.",
        evidence: [{ label: "Common selectors", value: "No TXT observed" }],
      },
    },
  },
  {
    id: "mail.mx.v1",
    category: "Email",
    name: "MX",
    method: "DNS MX lookup at the submitted hostname",
    checked: "Whether public MX records point {domain} at a mail host.",
    whyItMatters:
      "MX is the public mapping from domain to mail host. It is collected by the existing SPF and DMARC snapshot methods as supporting data.",
    remainsUnknown:
      "An MX record does not establish that mail is accepted, or that the host is the intended provider.",
    variants: {
      latest: {
        status: "clear",
        summary: "MX records point {domain} at a mail host.",
        observed: "MX for {domain} pointed at mail.{domain} with priority 10.",
        evidence: [
          { label: "MX", value: "10 mail.{domain}" },
        ],
      },
      mid: {
        status: "clear",
        summary: "MX records point {domain} at a mail host.",
        observed: "MX for {domain} pointed at mail.{domain}.",
        evidence: [{ label: "MX", value: "10 mail.{domain}" }],
      },
      early: {
        status: "clear",
        summary: "MX records point {domain} at a mail host.",
        observed: "MX for {domain} pointed at mail.{domain}.",
        evidence: [{ label: "MX", value: "10 mail.{domain}" }],
      },
    },
  },
  {
    id: "mail.host.v1",
    category: "Email",
    name: "Mail host exposure",
    method: "Bounded connection to the published mail host. Not a mail-server test.",
    checked:
      "Whether the published mail host for {domain} presents a public mail service on a common port.",
    whyItMatters:
      "A public mail service on the published host is an observable fact. It is not a finding of weak authentication.",
    remainsUnknown:
      "This does not establish mail server configuration, authentication quality, or whether the host accepts mail for the domain.",
    variants: {
      latest: {
        status: "informational",
        summary: "The published mail host responded on 25/tcp.",
        observed:
          "mail.{domain} accepted a TCP connection on port 25 and returned a short SMTP banner.",
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
    id: "web.technology_signals.v1",
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
    id: "dns.ct_names.v1",
    category: "Domain & DNS",
    name: "Certificate transparency names",
    method: "Inspection of the presented certificate and a public CT log query",
    checked:
      "Which names appear on the presented certificate for {domain}, and whether a matching certificate is visible in public CT logs.",
    whyItMatters:
      "The certificate is a public statement of names the operator asked a CA to bind. Extra names are reviewable facts.",
    remainsUnknown:
      "CT visibility does not prove that every issued certificate is still in use, and this check does not establish private-key hygiene.",
    variants: {
      latest: {
        status: "clear",
        summary: "Certificate covers {domain} and www.{domain}, within its validity window.",
        observed:
          "The presented certificate includes {domain} and www.{domain}. A matching leaf was visible in public CT logs.",
        evidence: [
          { label: "SAN", value: "{domain}, www.{domain}" },
          { label: "CT log", value: "Matching leaf observed" },
        ],
      },
      mid: {
        status: "clear",
        summary: "Certificate covers {domain} and www.{domain}.",
        observed: "The presented certificate includes {domain} and www.{domain}.",
        evidence: [{ label: "SAN", value: "{domain}, www.{domain}" }],
      },
      early: {
        status: "clear",
        summary: "Certificate covers {domain}.",
        observed: "The presented certificate includes {domain}.",
        evidence: [{ label: "SAN", value: "{domain}" }],
      },
    },
  },
  {
    id: "web.common_interfaces.v1",
    category: "Web presence",
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
        summary: "No commonly guessed admin path returned an application login in this set.",
        observed:
          "GET requests to /admin, /login and /wp-admin on {domain} did not return a 200 with an authentication form. This is not a complete content discovery exercise.",
        evidence: [
          { label: "/admin", value: "404" },
          { label: "/login", value: "404" },
          { label: "/wp-admin", value: "404" },
        ],
      },
      mid: {
        status: "clear",
        summary: "No commonly guessed admin path returned an application login in this set.",
        observed: "Guessed admin paths returned 404.",
        evidence: [
          { label: "/admin", value: "404" },
          { label: "/login", value: "404" },
        ],
      },
      early: {
        status: "clear",
        summary: "No commonly guessed admin path returned an application login in this set.",
        observed: "Guessed admin paths returned 404.",
        evidence: [{ label: "/admin", value: "404" }],
      },
    },
  },
  {
    id: "net.public_banner.v1",
    category: "Public services",
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
    observations.push(
      attachSource(
        {
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
        },
        { recommendation: v.recommendation ?? null },
      ),
    );
  }
  return observations;
}

function applyDomainOverrides(
  domain: string,
  observations: Observation[],
  variant: Variant = "latest",
) {
  const host = domain.toLowerCase();
  if (host === "jonesmfg.com") {
    return observations.map((obs) => {
      if (obs.id === "web.hsts.v1") {
        if (variant !== "latest") return obs;
        return attachSource({
          ...obs,
          status: "clear",
          summary: "The response included HSTS with a positive max-age.",
          observed: `The apex HTTPS response for ${host} included Strict-Transport-Security with max-age=31536000.`,
          evidence: [
            {
              label: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
          ],
          recommendation: null,
        });
      }
      if (obs.id === "web.security_headers.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary:
            "The response included nosniff, a framing-policy declaration, CSP and a recognized Referrer-Policy.",
          observed: `The apex HTTPS response for ${host} included nosniff, CSP and Referrer-Policy.`,
          evidence: [
            { label: "X-Content-Type-Options", value: "nosniff" },
            { label: "Content-Security-Policy", value: "default-src 'self'" },
            { label: "Referrer-Policy", value: "same-origin" },
          ],
          recommendation: null,
        });
      }
      if (obs.id === "mail.dmarc.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary: "A parseable DMARC quarantine or reject policy was observed.",
          observed: `DMARC was published for ${host}. Policy was p=quarantine.`,
          evidence: [{ label: "DMARC", value: "v=DMARC1; p=quarantine" }],
          recommendation: null,
        });
      }
      if (obs.id === "mail.spf.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary: "One SPF record was parseable and no unconditional pass mechanism was observed.",
          observed: `SPF was published for ${host} with a hard-fail all mechanism.`,
          evidence: [{ label: "SPF", value: `v=spf1 include:_spf.${host} -all` }],
        });
      }
      return obs;
    });
  }
  if (host === "mymsp.io") {
    return observations.map((obs) => {
      if (obs.id === "mail.dmarc.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary: "A parseable DMARC quarantine or reject policy was observed.",
          observed: `DMARC was published for ${host}. Policy was p=reject.`,
          evidence: [{ label: "DMARC", value: "v=DMARC1; p=reject" }],
          recommendation: null,
        });
      }
      if (obs.id === "mail.spf.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary: "One SPF record was parseable and no unconditional pass mechanism was observed.",
          observed: `SPF was published for ${host} with a hard-fail all mechanism.`,
          evidence: [{ label: "SPF", value: `v=spf1 include:_spf.${host} -all` }],
        });
      }
      return obs;
    });
  }
  if (host === "203.0.113.24") {
    return observations.map((obs) => {
      if (obs.id === "tls.certificate.v1") {
        return attachSource({
          ...obs,
          status: "needs_attention",
          summary: "The observed certificate failed trust or hostname checks.",
          observed:
            "A certificate was presented during the TLS handshake on port 443. The certificate name did not match a hostname on this address.",
          evidence: [
            { label: "Observed address", value: host },
            { label: "Certificate subject", value: "CN=api.acme.com" },
            { label: "Issuer", value: "Let's Encrypt" },
            { label: "Protocol", value: "TLS 1.3" },
          ],
          recommendation: "Review the certificate chain and hostname coverage.",
        });
      }
      if (obs.id === "web.security_headers.v1") {
        return attachSource({
          ...obs,
          status: "informational",
          summary:
            "Nosniff and a framing-policy declaration were not fully observed on this address.",
          observed: `GET https://${host}/ returned 200. Strict-Transport-Security was not present.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "200" },
            { label: "X-Content-Type-Options", value: "nosniff" },
          ],
        });
      }
      if (obs.id === "net.public_banner.v1") {
        return attachSource({
          ...obs,
          status: "informational",
          summary: "SSH on port 22 returned a short identifying banner.",
          observed:
            "A bounded connection to port 22 returned SSH-2.0-OpenSSH. A banner is a public signal, not a finding of weakness.",
          evidence: [
            { label: "Target", value: host },
            { label: "Port", value: "22" },
            { label: "Banner", value: "SSH-2.0-OpenSSH" },
          ],
        });
      }
      return obs;
    });
  }
  if (host === "api.acme.com") {
    return observations.map((obs) => {
      if (obs.id === "web.hsts.v1") {
        if (variant !== "latest") {
          return attachSource({
            ...obs,
            status: "clear",
            summary: "The response included HSTS with a positive max-age.",
            observed: `The HTTPS response for ${host} included Strict-Transport-Security.`,
            evidence: [
              { label: "Request", value: `GET https://${host}/` },
              { label: "Status", value: "200" },
              { label: "Strict-Transport-Security", value: "max-age=31536000" },
            ],
            recommendation: null,
          });
        }
        return attachSource({
          ...obs,
          status: "needs_attention",
          summary: "The response did not include HSTS.",
          observed: `The HTTPS response for ${host} did not include Strict-Transport-Security.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "200" },
            { label: "Strict-Transport-Security", value: "Not present" },
          ],
          recommendation:
            "Consider a suitable Strict-Transport-Security policy after validating HTTPS coverage.",
        });
      }
      if (obs.id === "web.technology_signals.v1") {
        return attachSource({
          ...obs,
          status: "informational",
          summary: "Public responses named an API gateway and a JSON content type.",
          observed: `Responses from ${host} included a gateway header and application/json. This is a public signal, not a finding of weakness.`,
          evidence: [
            { label: "Content-Type", value: "application/json" },
            { label: "Server header", value: "cloudflare" },
          ],
        });
      }
      if (obs.id === "web.security_txt.v1") {
        return attachSource({
          ...obs,
          status: "informational",
          summary: "No security.txt file was observed at this location.",
          observed: `GET https://${host}/.well-known/security.txt returned 404.`,
          evidence: [
            { label: "Path", value: "/.well-known/security.txt" },
            { label: "Status", value: "404" },
          ],
          recommendation: "Consider publishing security.txt at /.well-known/security.txt.",
        });
      }
      if (obs.id === "web.https_redirect.v1") {
        return attachSource({
          ...obs,
          status: "clear",
          summary: "The HTTP root request transitioned to a usable HTTPS response.",
          observed: `GET https://${host}/health returned HTTP 200.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/health` },
            { label: "Status", value: "200" },
          ],
        });
      }
      return obs;
    });
  }
  if (host === "mail.acme.com") {
    return observations.map((obs) => {
      if (obs.id === "web.https_redirect.v1" || obs.id === "web.hsts.v1" || obs.id === "web.security_headers.v1") {
        return attachSource({
          ...obs,
          status: "informational",
          summary: "The mail hostname did not return a usable HTTPS website response.",
          observed: `HTTPS on ${host} returned 404. This hostname appears to be used for mail, not a public website.`,
          evidence: [
            { label: "Request", value: `GET https://${host}/` },
            { label: "Status", value: "404" },
          ],
          recommendation: null,
        });
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
    return attachSource({
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
        "This does not establish whether authentication is weak, the service is vulnerable, or access is unauthorized. Ports other than the selected set were not checked. A future bounded product runner is required; this is not the public hostname snapshot and not an OFFSEC nmap workflow.",
      method: "TCP connection attempt",
      observedAt,
      implementation: "MOCK_ONLY",
      checkVersion: MOCK_CHECK_VERSION,
    });
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
    variant,
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

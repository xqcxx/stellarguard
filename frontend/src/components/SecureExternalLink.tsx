import React from "react";
import { buildSecureRel, requiresSecureRel } from "@/lib/externalLinks";

type SecureExternalLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function SecureExternalLink({ href, target = "_blank", rel, children, ...props }: SecureExternalLinkProps) {
  const secureRel = requiresSecureRel(target) ? buildSecureRel(rel) : rel;

  return (
    <a href={href} target={target} rel={secureRel} {...props}>
      {children}
    </a>
  );
}

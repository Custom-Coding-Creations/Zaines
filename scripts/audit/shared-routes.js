#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const PUBLIC_AUDIT_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/book",
  "/dog",
  "/dog/calm",
  "/faq",
  "/gallery",
  "/policies",
  "/pricing",
  "/privacy",
  "/reviews",
  "/services/boarding",
  "/services/daycare",
  "/services/grooming",
  "/services/training",
  "/suites",
  "/auth/signin",
];

const ISSUE66_PERFORMANCE_ROUTES = [
  { path: "/", name: "home" },
  { path: "/book", name: "booking" },
  { path: "/pricing", name: "pricing" },
  { path: "/services/boarding", name: "boarding" },
  { path: "/dog", name: "dog-mode" },
  { path: "/auth/signin", name: "sign-in" },
];

module.exports = {
  PUBLIC_AUDIT_ROUTES,
  ISSUE66_PERFORMANCE_ROUTES,
};

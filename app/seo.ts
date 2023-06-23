// app/seo.ts
import { title } from "process";
import { initSeo } from "remix-seo";
export const { getSeo, getSeoMeta, getSeoLinks } = initSeo({
  // Pass any SEO defaults for your site here.
  // If individual routes do not provide their own meta and link tags,
  // the tags generated by the defaults will be used.
  title: "Tailwind Remix-run Starter Blog",
  titleTemplate: "%s | Tailwind Remix-run Starter Blog",
  description: "A blog created with Remix-run and Tailwind.css",
  openGraph: {
    url: "https://tailwind-remix-run-mdxjs-typescript-starter-blog.fly.dev",
    type: "website",
    siteName: "Tailwind Remix-run Starter Blog",
    description: "A blog created with Remix-run and Tailwind.css",
    title: "Tailwind Remix-run Starter Blog",
    // images: [{ url: "", alt: "" }],
  },
  twitter: {
    title: "Remix-run tailwindcss starter blog",
    card: "summary_large_image",
    site: "https://tailwind-remix-run-mdxjs-typescript-starter-blog.fly.dev",
    description: "A blog created with Remix-run and Tailwind.css",
    //  image: { url: "", alt: "" }
  },
});

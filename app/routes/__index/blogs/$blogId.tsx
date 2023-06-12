import { json, type LoaderFunction } from "@remix-run/server-runtime";
import { MDXLayoutRenderer } from "~/components/MDXComponents";
import PageTitle from "~/components/PageTitle";
import type { Params } from "@remix-run/react";
import type { Post } from "~/lib/utils/mdx.server";
import { getFileBySlug } from "~/lib/utils/mdx.server";
import { useLoaderData } from "@remix-run/react";
import { getSeo, getSeoMeta, getSeoLinks } from "~/seo";

export let meta = (context: any) => {
  let seoMeta = getSeoMeta({
    title: context.data.extendedFrontMatter.title,
    description: context.data.extendedFrontMatter.description,
  });
  return {
    ...seoMeta,
  };
};

export const loader: LoaderFunction = async ({
  params,
}: {
  params: Params;
}) => {
  const id = params.blogId;
  if (id) {
    const post = await getFileBySlug("blog", id);
    return json(post);
  }
};

export default function Blog() {
  const post = useLoaderData();
  return (
    <>
      {post.extendedFrontMatter.draft !== true ? (
        <div>
          <MDXLayoutRenderer
            mdxSource={post.mdxSource}
            layout={"PostSimple"}
            extendedFrontMatter={post.extendedFrontMatter}
            toc={post.toc}
          />
        </div>
      ) : (
        <>
          <div className="mt-24 text-center">
            <PageTitle>
              Under Construction{" "}
              <span role="img" aria-label="roadwork sign">
                🚧
              </span>
            </PageTitle>
          </div>
        </>
      )}
    </>
  );
}

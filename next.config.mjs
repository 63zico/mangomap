/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 80,
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.mango-vietnam.com" }],
        destination: "https://mango-vietnam.com/:path*",
        permanent: true,
      },
      {
        source: "/ha-noi",
        destination: "/hanoi",
        permanent: true,
      },
      {
        source: "/ha-noi/:path*",
        destination: "/hanoi/:path*",
        permanent: true,
      },
      {
        source: "/hochiminh",
        destination: "/ho-chi-minh",
        permanent: true,
      },
      {
        source: "/hochiminh/:path*",
        destination: "/ho-chi-minh/:path*",
        permanent: true,
      },
      {
        source: "/danang",
        destination: "/da-nang",
        permanent: true,
      },
      {
        source: "/danang/:path*",
        destination: "/da-nang/:path*",
        permanent: true,
      },
      {
        source: "/natrang",
        destination: "/nha-trang",
        permanent: true,
      },
      {
        source: "/natrang/:path*",
        destination: "/nha-trang/:path*",
        permanent: true,
      },
      {
        source: "/phuquoc",
        destination: "/phu-quoc",
        permanent: true,
      },
      {
        source: "/phuquoc/:path*",
        destination: "/phu-quoc/:path*",
        permanent: true,
      },
      {
        source: "/dalat",
        destination: "/da-lat",
        permanent: true,
      },
      {
        source: "/dalat/:path*",
        destination: "/da-lat/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

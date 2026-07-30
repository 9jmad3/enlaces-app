export const profiles = [
  {
    slug: 'ejemplo',
    name: 'Ejemplo',
    description: 'Todo lo tuyo, en un solo lugar.',
    bio: 'Una página sencilla para reunir tus redes, proyectos y lugares importantes.',
    image: '',
    socialLinks: [],
    links: [
      {
        title: 'Instagram',
        link: 'https://www.instagram.com/',
        icon: 'ri:instagram-fill',
      },
      {
        title: 'Mi blog',
        link: 'https://example.com/',
        icon: 'ic:outline-language',
      },
    ],
    contactHref: '/registro',
    contactLabel: 'Crea el tuyo',
    siteTitle: 'Ejemplo | Trazli',
    siteDescription: 'Ejemplo de una página personal creada con Trazli.',
  },
];

export function getProfileBySlug(slug) {
  return profiles.find((profile) => profile.slug === slug);
}

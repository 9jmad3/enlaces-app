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
    siteTitle: 'Ejemplo | Nexo',
    siteDescription: 'Ejemplo de una página personal creada con Nexo.',
  },
  {
    slug: 'jmaledom',
    name: 'José',
    description: 'Vida, código y movimiento.',
    bio: 'Aquí puedes saber más de mí, seguir lo que hago y encontrar mis enlaces principales.',
    image: '/img/jose-profile.jpeg',
    socialLinks: [
      {
        socialName: 'Instagram',
        socialUl: 'https://instagram.com/jmaledom',
        socialIcon: 'ri:instagram-fill',
      },
      {
        socialName: 'TikTok',
        socialUl: 'https://tiktok.com/@jmaledomtk',
        socialIcon: 'ic:outline-tiktok',
      },
    ],
    links: [
      {
        title: 'Instagram',
        link: 'https://instagram.com/jmaledom',
        icon: 'ri:instagram-fill',
      },
      {
        title: 'TikTok',
        link: 'https://tiktok.com/@jmaledomtk',
        icon: 'ic:outline-tiktok',
      },
      {
        title: 'Mi blog',
        link: 'https://www.jmaledom.es/',
        icon: 'ic:outline-language',
      },
      {
        title: 'Descuentos y regalos Zumub España',
        link: 'http://zumu.be/jmaledom',
        icon: 'mingcute:coupon-line',
      },
    ],
    contactHref: 'https://instagram.com/jmaledom',
    contactLabel: 'Quiero el mío',
    siteTitle: 'José | Enlaces',
    siteDescription: 'Vida, código y movimiento. Enlaces y contacto de José.',
  },
];

export function getProfileBySlug(slug) {
  return profiles.find((profile) => profile.slug === slug);
}

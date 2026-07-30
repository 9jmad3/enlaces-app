import { saveProfile } from '../../../lib/profiles.js';
import { normalizeSlug, validateSlug } from '../../../lib/validation.js';
import { sameOrigin } from '../../../lib/security.js';

export const prerender = false;

function panelError(message) {
  return `/app?error=${encodeURIComponent(message)}`;
}

export async function POST({ request, locals, redirect }) {
  if (!locals.user) return redirect('/login');
  if (!sameOrigin(request)) {
    return new Response('Solicitud no permitida', { status: 403 });
  }

  const form = await request.formData();
  const slug = normalizeSlug(form.get('slug'));
  const displayName = String(form.get('displayName') || '').trim();
  const tagline = String(form.get('tagline') || '').trim();
  const bio = String(form.get('bio') || '').trim();

  const slugError = validateSlug(slug);
  if (slugError) return redirect(panelError(slugError));
  if (!displayName || displayName.length > 60) {
    return redirect(panelError('Escribe un nombre de hasta 60 caracteres.'));
  }
  if (tagline.length > 100 || bio.length > 280) {
    return redirect(panelError('Revisa la longitud de la descripcion y la biografia.'));
  }

  const links = Array.from({ length: 6 }, (_, index) => ({
    title: String(form.get(`linkTitle${index}`) || ''),
    url: String(form.get(`linkUrl${index}`) || ''),
    enabled: form.get(`linkEnabled${index}`) === 'on',
  }));

  try {
    await saveProfile(locals.user.id, {
      slug,
      displayName,
      tagline,
      bio,
      avatarUrl: String(form.get('avatarUrl') || ''),
      templateId: String(form.get('templateId') || 'studio'),
      backgroundColor: String(form.get('backgroundColor') || ''),
      accentColor: String(form.get('accentColor') || ''),
      textColor: String(form.get('textColor') || ''),
      published: form.get('published') === 'on',
      links,
    });
    return redirect('/app?saved=1');
  } catch (error) {
    if (error?.code === '23505') {
      return redirect(panelError('Ese nombre de usuario ya esta ocupado.'));
    }
    console.error('No se pudo guardar el perfil', error);
    return redirect(panelError('No hemos podido guardar los cambios.'));
  }
}

import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Origin reads: required for ISR/tag-based revalidation so refetches after
  // revalidateTag() never hit the stale Sanity CDN edge cache.
  useCdn: false,
})

import { type SchemaTypeDefinition } from 'sanity'
import destination from './destination'
import homepage from './homepage'
import post from './post'
import tourPricing from './tour-pricing'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [destination, homepage, post, tourPricing],
}

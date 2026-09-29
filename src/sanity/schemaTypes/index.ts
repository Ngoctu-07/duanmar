import { type SchemaTypeDefinition } from 'sanity'
import article from './article'
import country from './country'
import destination from './destination'
import homepage from './homepage'
import siteConfiguration from './site-configuration'
import tourPricing from './tour-pricing'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [article, country, destination, homepage, siteConfiguration, tourPricing],
}

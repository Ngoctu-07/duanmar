import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .id('siteConfiguration')
        .title('Site Configuration')
        .schemaType('siteConfiguration')
        .child(
          S.document()
            .schemaType('siteConfiguration')
            .documentId('siteConfiguration')
        ),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() !== 'siteConfiguration'
      ),
    ])

import React from 'react';
import RepositoryLayout from '../layouts/page-repository';
import { addComponent } from './add-component';

export function addPageTemplate(template) {
  const key = `page-${template}`;
  if (typeof template === 'string' && template.startsWith('repository:')) {
    return <RepositoryLayout key={key} name={template.slice('repository:'.length)} />;
  }
  return addComponent('layouts', 'page', template, key, null, null, null);
}

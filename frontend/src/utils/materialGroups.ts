const BATCH_PREFIX = '__MATERIAL_BATCH__';

export const createMaterialBatchContent = (batchId: string, title: string) =>
  `${BATCH_PREFIX}${JSON.stringify({ id: batchId, title })}`;

export const parseMaterialBatch = (content?: string) => {
  if (!content?.startsWith(BATCH_PREFIX)) return null;
  try {
    const parsed = JSON.parse(content.slice(BATCH_PREFIX.length));
    if (!parsed?.id) return null;
    return {
      id: String(parsed.id),
      title: String(parsed.title || ''),
    };
  } catch {
    return null;
  }
};

export const visibleMaterialContent = (content?: string) =>
  content?.startsWith(BATCH_PREFIX) ? '' : content || '';

const fallbackTitleParts = (title?: string) => {
  const value = title || 'Tài liệu';
  const separator = value.indexOf(' - ');
  if (separator === -1) return { groupTitle: value, itemTitle: value };
  return {
    groupTitle: value.slice(0, separator).trim() || value,
    itemTitle: value.slice(separator + 3).trim() || value,
  };
};

export const groupSessionMaterials = (materials: any[] = []) => {
  const groups: any[] = [];
  const groupMap = new Map<string, any>();

  materials.forEach((material) => {
    const batch = parseMaterialBatch(material.content);
    const fallback = fallbackTitleParts(material.title);
    const createdMinute = material.created_at
      ? new Date(material.created_at).toISOString().slice(0, 16)
      : String(material.id);
    const groupKey = batch
      ? `batch:${batch.id}`
      : `fallback:${material.material_type}:${fallback.groupTitle}:${createdMinute}`;
    const groupTitle = batch?.title || fallback.groupTitle;
    const itemTitle = batch ? material.title || 'Tài liệu' : fallback.itemTitle;

    if (!groupMap.has(groupKey)) {
      const group = {
        id: groupKey,
        title: groupTitle,
        material_type: material.material_type,
        created_at: material.created_at,
        uploaded_by_name: material.uploaded_by_name,
        items: [],
      };
      groupMap.set(groupKey, group);
      groups.push(group);
    }

    const group = groupMap.get(groupKey);
    group.items.push({
      ...material,
      display_title: itemTitle,
      visible_content: visibleMaterialContent(material.content),
    });
  });

  return groups;
};

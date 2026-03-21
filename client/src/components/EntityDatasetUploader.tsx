import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedData {
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
    description?: string;
  }>;
}

interface EntityDatasetUploaderProps {
  onDataParsed: (data: ParsedData) => void;
  onUpload?: (file: File) => Promise<string>;
}

export const EntityDatasetUploader: React.FC<EntityDatasetUploaderProps> = ({
  onDataParsed,
  onUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = (content: string): ParsedData => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header row');

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const entities: ParsedData['entities'] = [];
    const relationships: ParsedData['relationships'] = [];

    // Detect if this is entities or relationships based on header
    const isRelationships = header.includes('source') && header.includes('target');

    if (isRelationships) {
      // Parse relationships
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 3) continue;

        const sourceIdx = header.indexOf('source');
        const targetIdx = header.indexOf('target');
        const typeIdx = header.indexOf('type') || header.indexOf('relationshiptype');
        const strengthIdx = header.indexOf('strength');
        const descIdx = header.indexOf('description');

        relationships.push({
          source: values[sourceIdx],
          target: values[targetIdx],
          type: values[typeIdx] || 'RELATES_TO',
          strength: strengthIdx >= 0 ? parseFloat(values[strengthIdx]) || 0.5 : 0.5,
          description: descIdx >= 0 ? values[descIdx] : undefined,
        });
      }
    } else {
      // Parse entities
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;

        const idIdx = header.indexOf('id');
        const nameIdx = header.indexOf('name');
        const typeIdx = header.indexOf('type');
        const descIdx = header.indexOf('description');

        entities.push({
          id: idIdx >= 0 ? values[idIdx] : `entity-${i}`,
          name: values[nameIdx] || values[0],
          type: typeIdx >= 0 ? values[typeIdx] : 'Entity',
          description: descIdx >= 0 ? values[descIdx] : undefined,
        });
      }
    }

    return { entities, relationships };
  };

  const parseJSON = (content: string): ParsedData => {
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      // Check if it's entities or relationships
      if (data.length > 0 && 'source' in data[0]) {
        return {
          entities: [],
          relationships: data.map((r: any) => ({
            source: r.source,
            target: r.target,
            type: r.type || 'RELATES_TO',
            strength: r.strength || 0.5,
            description: r.description,
          })),
        };
      } else {
        return {
          entities: data.map((e: any) => ({
            id: e.id || `entity-${Math.random()}`,
            name: e.name,
            type: e.type || 'Entity',
            description: e.description,
          })),
          relationships: [],
        };
      }
    }

    if (data.entities && data.relationships) {
      return {
        entities: data.entities,
        relationships: data.relationships,
      };
    }

    throw new Error('Invalid JSON format');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const content = await selectedFile.text();
      let parsed: ParsedData;

      if (selectedFile.name.endsWith('.csv')) {
        parsed = parseCSV(content);
      } else if (selectedFile.name.endsWith('.json')) {
        parsed = parseJSON(content);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      if (parsed.entities.length === 0 && parsed.relationships.length === 0) {
        throw new Error('No valid data found in file');
      }

      setPreview(parsed);
      toast.success(`Parsed ${parsed.entities.length} entities and ${parsed.relationships.length} relationships`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      if (onUpload && file) {
        await onUpload(file);
      }
      onDataParsed(preview);
      toast.success('Dataset loaded successfully');
      setFile(null);
      setPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="p-6 border-2 border-dashed border-gray-300 hover:border-teal-500 transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center gap-3">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="font-semibold text-gray-700">Upload Entity Dataset</p>
            <p className="text-sm text-gray-500">CSV or JSON format</p>
          </div>
          <Input
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </label>
      </Card>

      {/* File Info */}
      {file && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Selected: {file.name}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Size: {(file.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Data Preview</p>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-700 font-semibold">{preview.entities.length}</p>
                    <p className="text-green-600">Entities</p>
                  </div>
                  <div>
                    <p className="text-green-700 font-semibold">{preview.relationships.length}</p>
                    <p className="text-green-600">Relationships</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Entity Preview */}
          {preview.entities.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Sample Entities</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {preview.entities.slice(0, 5).map((entity, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-xs text-gray-600">{entity.type}</p>
                  </div>
                ))}
                {preview.entities.length > 5 && (
                  <p className="text-xs text-gray-500 p-2">
                    +{preview.entities.length - 5} more entities
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Relationship Preview */}
          {preview.relationships.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Sample Relationships</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {preview.relationships.slice(0, 5).map((rel, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                    <p className="font-medium">
                      {rel.source} → {rel.target}
                    </p>
                    <p className="text-xs text-gray-600">
                      {rel.type} (strength: {rel.strength.toFixed(2)})
                    </p>
                  </div>
                ))}
                {preview.relationships.length > 5 && (
                  <p className="text-xs text-gray-500 p-2">
                    +{preview.relationships.length - 5} more relationships
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Dataset'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setError(null);
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-semibold text-sm mb-2">Format Guide</h4>
        <div className="space-y-2 text-xs text-gray-700">
          <div>
            <p className="font-medium">Entities CSV:</p>
            <code className="block bg-white p-2 rounded mt-1 overflow-x-auto">
              id,name,type,description
            </code>
          </div>
          <div>
            <p className="font-medium">Relationships CSV:</p>
            <code className="block bg-white p-2 rounded mt-1 overflow-x-auto">
              source,target,type,strength,description
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EntityDatasetUploader;

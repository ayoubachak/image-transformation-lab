import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  BackgroundVariant,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { usePipeline } from '../contexts/PipelineContext';
import InputNode from './nodes/InputNode';
import TransformationNode from './nodes/TransformationNode';
import OutputNode from './nodes/OutputNode';

// Define nodeTypes outside of the component to avoid recreation on each render
const nodeTypes: NodeTypes = {
  input: InputNode,
  transformation: TransformationNode,
  output: OutputNode,
};

// Define custom edge types for more attractive connections
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd }: any) => {
  // Calculate a smooth curve for the edge
  const midX = (sourceX + targetX) / 2;
  
  // Create a smoothly curved path
  const path = `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
  
  return (
    <>
      <path
        className="react-flow__edge-path-bg"
        d={path}
        strokeWidth={4}
        stroke="#e2e8f0"
        fill="none"
      />
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        strokeWidth={2}
        stroke="#64748b"
        fill="none"
        strokeDasharray="0"
        markerEnd={markerEnd}
        style={style}
      />
    </>
  );
};

// Edge with animation
const AnimatedEdge = (props: any) => {
  return (
    <CustomEdge
      {...props}
      style={{ strokeDasharray: '5,5', animation: 'flow 1s linear infinite' }}
    />
  );
};

// Define edgeTypes
const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  animated: AnimatedEdge,
};

// Custom edge styles
const edgeOptions = {
  type: 'animated',
  style: {
    stroke: '#64748b',
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#64748b',
    width: 15,
    height: 15,
  },
  animated: true,
};

interface ImageProcessingPipelineProps {
  readOnly?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  highlightNodeId?: string | null;
  operationMode?: 'select' | 'connect' | 'disconnect' | null;
}

export default function ImageProcessingPipeline({ 
  readOnly = false,
  onNodeClick,
  onEdgeClick,
  highlightNodeId,
  operationMode
}: ImageProcessingPipelineProps) {
  const { 
    nodes: contextNodes, 
    edges: contextEdges, 
    addEdge: addContextEdge,
    removeEdge: removeContextEdge,
    updateNode: updateContextNode,
    selectNode,
  } = usePipeline();

  // Convert context nodes to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => contextNodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { node },
    draggable: !readOnly,
    // Add specific class names for node types to enable custom styling
    className: `node-${node.type} ${
      highlightNodeId === node.id ? 'ring-2 ring-green-500' : ''
    } ${
      operationMode === 'connect' ? 'cursor-pointer' : ''
    }`,
    // Ensure nodes have appropriate size behavior
    style: {
      width: 'auto',
      height: 'auto',
      minWidth: '18rem', // 18rem = w-72
    }
  })), [contextNodes, readOnly, highlightNodeId, operationMode]);

  // Convert context edges to ReactFlow edges
  const initialEdges: Edge[] = useMemo(() => contextEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'animated',
    animated: true,
    style: {
      ...edgeOptions.style,
      // Change cursor to pointer in disconnect mode
      cursor: operationMode === 'disconnect' ? 'pointer' : 'default',
      // Highlight edge that would be created in connect mode
      stroke: (highlightNodeId && 
              (edge.source === highlightNodeId || edge.target === highlightNodeId)) 
              ? '#10b981' // green-500
              : edgeOptions.style.stroke
    },
    markerEnd: edgeOptions.markerEnd,
  })), [contextEdges, highlightNodeId, operationMode]);

  // Use ReactFlow's state management hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes in context when they're moved in ReactFlow
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    updateContextNode(node.id, { position: node.position });
  }, [updateContextNode]);

  // Handle connections between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addContextEdge(connection.source, connection.target);
        setEdges((eds) => addEdge({
          ...connection,
          animated: true,
          type: 'animated',
          style: edgeOptions.style,
          markerEnd: edgeOptions.markerEnd,
        }, eds));
      }
    },
    [addContextEdge, setEdges]
  );

  // Handle node click to select it or for connection mode
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // If we have a custom click handler and are in a special mode, use that
      if (onNodeClick && operationMode === 'connect') {
        onNodeClick(node.id);
      } else {
        // Default behavior: select the node
        selectNode(node.id);
      }
    },
    [selectNode, onNodeClick, operationMode]
  );

  // Handle edge click for removal or custom handling
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (operationMode === 'disconnect' && onEdgeClick) {
        onEdgeClick(edge.id);
      } else if (!readOnly) {
        removeContextEdge(edge.id);
      }
    },
    [removeContextEdge, readOnly, operationMode, onEdgeClick]
  );

  // Update ReactFlow nodes and edges when context changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges as Edge[]);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        minZoom={0.15}
        maxZoom={2}
        attributionPosition="bottom-right"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly && operationMode !== 'connect'}
        elementsSelectable={!readOnly}
        zoomOnDoubleClick={!readOnly}
        snapToGrid={true}
        snapGrid={[16, 16]}
        nodesFocusable={true}
        nodeDragThreshold={1}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
        connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        className="bg-slate-50"
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="bg-white shadow-md rounded-md border border-slate-200" />
        <MiniMap 
          nodeStrokeColor={(n) => {
            if (n.type === 'input') return '#1d4ed8';
            if (n.type === 'output') return '#15803d';
            return '#6b7280';
          }}
          nodeColor={(n) => {
            if (n.type === 'input') return '#dbeafe';
            if (n.type === 'output') return '#dcfce7';
            return '#f3f4f6';
          }}
          maskColor="rgba(240, 249, 255, 0.6)"
          className="bg-white border border-slate-200 rounded-md shadow-md"
        />
        <Background
          gap={16}
          size={1}
          color="#e2e8f0"
          variant={BackgroundVariant.Dots}
        />
        <Panel position="top-right" className="bg-white bg-opacity-80 p-2 rounded-md text-xs text-slate-500">
          {nodes.length} nodes | {edges.length} connections
        </Panel>

        {/* Operation mode indicators */}
        {operationMode === 'connect' && !highlightNodeId && (
          <Panel position="top-center" className="bg-green-50 text-green-700 p-2 rounded-md border border-green-200">
            Select a source node to start connecting
          </Panel>
        )}
        {operationMode === 'disconnect' && (
          <Panel position="top-center" className="bg-amber-50 text-amber-700 p-2 rounded-md border border-amber-200">
            Click on a connection to remove it
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
} 
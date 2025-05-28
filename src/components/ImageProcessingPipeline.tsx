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
import { useImageProcessing } from '../contexts/ImageProcessingContext';
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
}

export default function ImageProcessingPipeline({ readOnly = false }: ImageProcessingPipelineProps) {
  const { 
    nodes: contextNodes, 
    edges: contextEdges, 
    addEdge: addContextEdge,
    removeEdge: removeContextEdge,
    updateNode: updateContextNode,
    selectNode,
  } = useImageProcessing();

  // Convert context nodes to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => contextNodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { node },
    draggable: !readOnly,
    // Add specific class names for node types to enable custom styling
    className: `node-${node.type}`,
    // Ensure nodes have appropriate size behavior
    style: {
      width: 'auto',
      height: 'auto',
      minWidth: '18rem', // 18rem = w-72
    }
  })), [contextNodes, readOnly]);

  // Convert context edges to ReactFlow edges
  const initialEdges: Edge[] = useMemo(() => contextEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'animated',
    animated: true,
    style: edgeOptions.style,
    markerEnd: edgeOptions.markerEnd,
  })), [contextEdges]);

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

  // Handle node click to select it
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle edge removal
  const onEdgeDelete = useCallback(
    (edge: Edge) => {
      removeContextEdge(edge.id);
    },
    [removeContextEdge]
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
        onNodeClick={onNodeClick}
        onEdgeClick={readOnly ? undefined : (_, edge) => onEdgeDelete(edge)}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        minZoom={0.15}
        maxZoom={2}
        attributionPosition="bottom-right"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
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
      </ReactFlow>
    </div>
  );
} 
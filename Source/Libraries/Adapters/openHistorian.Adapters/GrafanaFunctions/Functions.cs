using GSF.TimeSeries;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace openHistorian.Adapters.GrafanaFunctions
{
    internal class Add : IFunctions
    {
        public string Regex { get; } = "Add";
        public string Name { get; } = "Add";
        public string Description { get; } = "Adds a decimal number to DataSourceValue";
        public List<IParameter> Parameters { get; }

        public Add()
        {
            // Initialize the list of parameters
            Parameters = new List<IParameter>
            {
                new Parameter<decimal>
                {
                    Default = typeof(decimal),
                    Description = "Decimal number to add",
                    Required = true
                },
                new Parameter<DataSourceValue>
                {
                    Default = typeof(DataSourceValue),
                    Description = "Series",
                    Required = true
                }
            };
        }

        public void Compute(List<object> values)
        {
            foreach (object value in values)
            {
                Console.WriteLine(value);
            }
        }
    }

    internal class Parameter<T> : IParameter
    {
        public Type Default { get; set; }
        public string Description { get; set; }
        public bool Required { get; set; }
        public Type Type { get; } = typeof(T);
    }
}
